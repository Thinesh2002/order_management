const { orderDb } = require('../config/db');
const { clean, safeJson } = require('../utils/dbUtils');
const { getMarketplaceAccountById } = require('./marketplaceAccountService');
const { writeSystemLog, writeOrderLog } = require('./logService');
const { callDaraz, documentFromResponse, findArrayWithKeys } = require('./darazClientService');

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function hasStatus(order, values = []) {
  const key = normalizeStatus(order.order_status || order.status || order.display_status);
  return values.some((value) => key === normalizeStatus(value) || key.includes(normalizeStatus(value)));
}

function isFinalDarazOrder(order) {
  return hasStatus(order, ['cancelled', 'canceled', 'delivered', 'returned', 'failed']);
}

function canPackDarazOrder(order) {
  if (isFinalDarazOrder(order)) return false;
  if (hasStatus(order, ['packed', 'ready_to_ship', 'ready to ship', 'shipped', 'dispatched'])) return false;
  return hasStatus(order, ['new', 'pending', 'unpaid', 'topack', 'to_pack', 'created']) || !normalizeStatus(order.order_status || order.status);
}

function canReadyToShipDarazOrder(order) {
  if (isFinalDarazOrder(order)) return false;
  if (hasStatus(order, ['ready_to_ship', 'ready to ship', 'shipped', 'dispatched'])) return false;
  return hasStatus(order, ['packed', 'to_arrange_shipment', 'to arrange shipment', 'toship', 'to_ship']);
}

function canPrintAwbDarazOrder(order) {
  return !isFinalDarazOrder(order);
}

function splitOrdersByEligibility(orders, predicate, actionLabel) {
  const valid = [];
  const skipped = [];
  for (const order of orders) {
    if (predicate(order)) valid.push(order);
    else skipped.push({
      order_id: order.id,
      order_no: order.order_number || order.daraz_order_id,
      status: order.order_status || order.status,
      message: `${actionLabel} not allowed for ${order.order_status || order.status || 'this'} order`,
    });
  }
  return { valid, skipped };
}

async function getDarazOrdersByLocalIds(orderIds = []) {
  const ids = [...new Set((Array.isArray(orderIds) ? orderIds : [orderIds]).map((id) => clean(id)).filter(Boolean))];
  if (!ids.length) throw Object.assign(new Error('Select at least one Daraz order.'), { statusCode: 400 });

  const [orders] = await orderDb.query(
    `SELECT * FROM daraz_orders WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
  if (!orders.length) throw Object.assign(new Error('No Daraz orders found for selected rows.'), { statusCode: 404 });

  const [items] = await orderDb.query(
    `SELECT * FROM daraz_order_items WHERE daraz_order_id IN (${orders.map(() => '?').join(',')})`,
    orders.map((row) => row.id),
  );

  return orders.map((order) => ({
    ...order,
    items: items.filter((item) => String(item.daraz_order_id) === String(order.id)),
  }));
}

async function getAccountForDarazOrder(order) {
  const account = await getMarketplaceAccountById(order.account_id);
  if (!account) throw Object.assign(new Error(`Marketplace account not found for Daraz account ID ${order.account_id}`), { statusCode: 404 });
  return account;
}

function orderItemIds(order) {
  return (order.items || [])
    .map((item) => item.daraz_order_item_id || item.order_item_id)
    .filter(Boolean)
    .map(String);
}

function packageIds(order) {
  return [...new Set((order.items || [])
    .map((item) => item.package_id || item.ofc_package_id)
    .filter(Boolean)
    .map(String))];
}

function deepGetRowsWithKeys(body, keys) {
  return findArrayWithKeys(body, keys) || [];
}

function pick(obj = {}, keys = [], fallback = null) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

async function updateItemsFromDarazRows(order, rows = []) {
  for (const item of rows) {
    const orderItemId = clean(pick(item, ['order_item_id', 'orderItemId', 'id'], ''));
    const packageId = clean(pick(item, ['package_id', 'ofc_package_id', 'packageId'], ''));
    const trackingCode = clean(pick(item, ['tracking_code', 'tracking_number', 'trackingCode'], ''));
    const shipmentProvider = clean(pick(item, ['shipment_provider', 'shipment_provider_name', 'provider_name'], ''));
    const status = clean(pick(item, ['status', 'item_status'], ''));
    if (!orderItemId && !packageId) continue;

    await orderDb.query(
      `UPDATE daraz_order_items
       SET package_id = COALESCE(NULLIF(?, ''), package_id),
           tracking_code = COALESCE(NULLIF(?, ''), tracking_code),
           shipment_provider = COALESCE(NULLIF(?, ''), shipment_provider),
           item_status = COALESCE(NULLIF(?, ''), item_status),
           raw_payload = ?,
           updated_at = NOW()
       WHERE daraz_order_id = ? AND (daraz_order_item_id = ? OR package_id = ?)`,
      [packageId, trackingCode, shipmentProvider, status, safeJson(item), order.id, orderItemId, packageId],
    ).catch(() => null);
  }
}

async function refreshOrderItemsFromDaraz(account, order) {
  const body = await callDaraz(account, process.env.DARAZ_ORDER_ITEMS_GET_PATH || '/order/items/get', {
    order_id: String(order.daraz_order_id),
  }, 'GET');
  const itemRows = deepGetRowsWithKeys(body, ['order_item_id', 'orderItemId', 'sku', 'seller_sku', 'package_id']);
  await updateItemsFromDarazRows(order, itemRows);
  const [freshItems] = await orderDb.query('SELECT * FROM daraz_order_items WHERE daraz_order_id = ?', [order.id]);
  return { ...order, items: freshItems, refreshed_body: body };
}

function extractPackRows(body) {
  return deepGetRowsWithKeys(body, ['order_item_id', 'tracking_number', 'package_id', 'item_err_code']);
}

async function updatePackResponse(order, body) {
  const rows = extractPackRows(body);
  await updateItemsFromDarazRows(order, rows);
  return rows;
}

function responseLooksFailed(body) {
  const success = body?.result?.success ?? body?.success;
  return success === false || String(success).toLowerCase() === 'false';
}

function successMessageFromBody(body, fallback = 'Daraz action response received.') {
  return body?.result?.error_msg || body?.message || body?.msg || fallback;
}

async function resolveShipmentProvider(account, accountOrders, provided = {}) {
  if (clean(provided.shipment_provider_code)) {
    return {
      shipment_provider_code: clean(provided.shipment_provider_code),
      shipping_allocate_type: clean(provided.shipping_allocate_type || 'TFS'),
      provider_response: null,
    };
  }

  const orders = accountOrders.map((order) => ({
    order_id: String(order.daraz_order_id),
    order_item_ids: orderItemIds(order),
  })).filter((row) => row.order_item_ids.length);

  const providerBody = await callDaraz(account, process.env.DARAZ_SHIPMENT_PROVIDERS_PATH || '/order/shipment/providers/get', {
    getShipmentProvidersReq: JSON.stringify({ orders }),
  }, 'POST');

  const providers = deepGetRowsWithKeys(providerBody, ['provider_code', 'name']);
  const selected = providers.find((provider) => clean(provider.provider_code)) || providers[0] || {};
  const shippingAllocateType = providerBody?.result?.data?.shipping_allocate_type || providerBody?.data?.shipping_allocate_type || provided.shipping_allocate_type || 'TFS';
  const providerCode = clean(selected.provider_code || selected.code || '');

  if (!providerCode) throw new Error('Daraz shipment provider code not found. Please pass shipment_provider_code manually.');

  return {
    shipment_provider_code: providerCode,
    shipping_allocate_type: clean(shippingAllocateType || 'TFS'),
    provider_response: providerBody,
  };
}

async function packDarazOrders(payload = {}) {
  const selectedOrders = await getDarazOrdersByLocalIds(payload.order_ids);
  const { valid: orders, skipped } = splitOrdersByEligibility(selectedOrders, canPackDarazOrder, 'Pack');
  const grouped = new Map();
  for (const order of orders) {
    if (!grouped.has(order.account_id)) grouped.set(order.account_id, []);
    grouped.get(order.account_id).push(order);
  }

  const result = { action: 'pack', total: selectedOrders.length, processed: orders.length, skipped, accounts: [], errors: [] };
  if (!orders.length) {
    await writeSystemLog({ action: 'DARAZ_PACK_SKIPPED', message: 'No selected Daraz orders were eligible for Pack.', meta: result }).catch(() => null);
    return result;
  }

  for (const [accountId, accountOrders] of grouped.entries()) {
    try {
      const account = await getAccountForDarazOrder(accountOrders[0]);
      const provider = await resolveShipmentProvider(account, accountOrders, payload);
      const pack_order_list = accountOrders.map((order) => ({
        order_id: String(order.daraz_order_id),
        order_item_list: orderItemIds(order),
      })).filter((row) => row.order_item_list.length);

      if (!pack_order_list.length) throw new Error('Daraz order item IDs missing. Sync order items first.');

      const body = await callDaraz(account, process.env.DARAZ_PACK_PATH || '/order/fulfill/pack', {
        packReq: JSON.stringify({
          pack_order_list,
          delivery_type: clean(payload.delivery_type || 'dropship'),
          shipment_provider_code: provider.shipment_provider_code,
          shipping_allocate_type: provider.shipping_allocate_type,
        }),
      }, 'POST');

      for (const order of accountOrders) await updatePackResponse(order, body);

      if (!responseLooksFailed(body)) {
        await orderDb.query(
          `UPDATE daraz_orders SET order_status = 'packed', updated_at = NOW() WHERE id IN (${accountOrders.map(() => '?').join(',')})`,
          accountOrders.map((row) => row.id),
        );
      }

      for (const order of accountOrders) {
        await writeOrderLog({ source_type: 'DARAZ', source_order_id: order.id, order_no: order.order_number || order.daraz_order_id, event_type: 'DARAZ_PACK', message: successMessageFromBody(body, 'Daraz order packed from order management.'), new_value: 'packed', meta: { body, provider } }).catch(() => null);
      }
      result.accounts.push({ account_id: accountId, account_name: account.account_name, count: accountOrders.length, provider, response: body });
    } catch (error) {
      result.errors.push({ account_id: accountId, message: error.message });
    }
  }
  await writeSystemLog({ action: 'DARAZ_PACK_BULK', message: `Daraz pack bulk completed for ${orders.length} selected orders`, meta: result }).catch(() => null);
  return result;
}

async function readyToShipDarazOrders({ order_ids = [] } = {}) {
  const selectedOrders = await getDarazOrdersByLocalIds(order_ids);
  const { valid: orders, skipped } = splitOrdersByEligibility(selectedOrders, canReadyToShipDarazOrder, 'Ready To Ship');
  const grouped = new Map();
  for (const order of orders) {
    if (!grouped.has(order.account_id)) grouped.set(order.account_id, []);
    grouped.get(order.account_id).push(order);
  }

  const result = { action: 'ready_to_ship', total: selectedOrders.length, processed: orders.length, skipped, accounts: [], errors: [] };
  if (!orders.length) {
    await writeSystemLog({ action: 'DARAZ_RTS_SKIPPED', message: 'No selected Daraz orders were eligible for Ready To Ship.', meta: result }).catch(() => null);
    return result;
  }

  for (const [accountId, rawAccountOrders] of grouped.entries()) {
    try {
      const account = await getAccountForDarazOrder(rawAccountOrders[0]);
      const accountOrders = [];
      for (const order of rawAccountOrders) accountOrders.push(packageIds(order).length ? order : await refreshOrderItemsFromDaraz(account, order));
      const packages = accountOrders.flatMap((order) => packageIds(order)).map((package_id) => ({ package_id }));
      if (!packages.length) throw new Error('Package IDs missing. Click Pack first, or sync Daraz order items again.');

      const body = await callDaraz(account, process.env.DARAZ_RTS_PATH || '/order/package/rts', {
        readyToShipReq: JSON.stringify({ packages }),
      }, 'POST');

      if (!responseLooksFailed(body)) {
        await orderDb.query(
          `UPDATE daraz_orders SET order_status = 'ready_to_ship', updated_at = NOW() WHERE id IN (${accountOrders.map(() => '?').join(',')})`,
          accountOrders.map((row) => row.id),
        );
      }

      for (const order of accountOrders) {
        await writeOrderLog({ source_type: 'DARAZ', source_order_id: order.id, order_no: order.order_number || order.daraz_order_id, event_type: 'DARAZ_READY_TO_SHIP', message: successMessageFromBody(body, 'Daraz order marked ready to ship.'), new_value: 'ready_to_ship', meta: body }).catch(() => null);
      }
      result.accounts.push({ account_id: accountId, account_name: account.account_name, count: accountOrders.length, response: body });
    } catch (error) {
      result.errors.push({ account_id: accountId, message: error.message });
    }
  }
  await writeSystemLog({ action: 'DARAZ_RTS_BULK', message: `Daraz RTS bulk completed for ${orders.length} selected orders`, meta: result }).catch(() => null);
  return result;
}

async function saveDarazDocument(order, document, source = 'print_awb') {
  if (!document) return null;
  try {
    const [insert] = await orderDb.query(
      `INSERT INTO daraz_order_documents
        (daraz_order_id, account_id, account_code, document_type, doc_type, mime_type, pdf_url, file_base64, source, raw_payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [order.id, order.account_id, order.account_code, document.document_type, document.doc_type, document.mime_type, document.pdf_url, document.file_base64, source, safeJson(document.raw_payload)],
    );
    return insert.insertId;
  } catch (_error) {
    return null;
  }
}

function withDocumentPointers(document, rowId = null) {
  if (!document) return null;
  return {
    ...document,
    id: rowId,
    has_file: Boolean(document.file_base64),
    has_pdf_url: Boolean(document.pdf_url),
    data_url: document.file_base64 ? `data:${document.mime_type || 'application/pdf'};base64,${document.file_base64}` : null,
  };
}

async function printPackageDocument(account, orders, payload) {
  const packages = orders.flatMap((order) => packageIds(order)).map((package_id) => ({ package_id }));
  if (!packages.length) return null;
  const body = await callDaraz(account, process.env.DARAZ_PRINT_AWB_PATH || '/order/package/document/get', {
    getDocumentReq: JSON.stringify({
      doc_type: clean(payload.doc_type || 'PDF'),
      print_item_list: String(payload.print_item_list === undefined ? false : Boolean(payload.print_item_list)),
      packages,
    }),
  }, 'POST');
  const document = documentFromResponse(body, { doc_type: payload.doc_type || 'PDF', document_type: 'shippingLabel' });
  return { body, document, packages };
}

function configuredLegacyDocumentPaths() {
  return [...new Set([
    process.env.DARAZ_LEGACY_DOCUMENT_PATH,
    '/order/document/get',
    '/order/document/awb/get',
  ].map(clean).filter(Boolean))];
}

async function printLegacyOrderDocument(account, order, payload) {
  const ids = orderItemIds(order);
  if (!ids.length) return null;

  const attempts = [];
  for (const path of configuredLegacyDocumentPaths()) {
    try {
      const body = await callDaraz(account, path, {
        doc_type: clean(payload.legacy_doc_type || 'shippingLabel'),
        order_item_ids: JSON.stringify(ids),
      }, 'GET');
      const document = documentFromResponse(body, { doc_type: 'shippingLabel', document_type: 'shippingLabel' });
      attempts.push({ path, success: Boolean(document), body });
      if (document) return { body, document, order_item_ids: ids, path, attempts };
    } catch (error) {
      attempts.push({ path, success: false, error: error.message });
    }
  }

  return { body: null, document: null, order_item_ids: ids, attempts };
}

async function printAwbDarazOrders(payload = {}) {
  const selectedOrders = await getDarazOrdersByLocalIds(payload.order_ids);
  const { valid: orders, skipped } = splitOrdersByEligibility(selectedOrders, canPrintAwbDarazOrder, 'Print AWB');
  const grouped = new Map();
  for (const order of orders) {
    if (!grouped.has(order.account_id)) grouped.set(order.account_id, []);
    grouped.get(order.account_id).push(order);
  }

  const result = { action: 'print_awb', total: selectedOrders.length, processed: orders.length, skipped, documents: [], errors: [] };
  if (!orders.length) {
    await writeSystemLog({ action: 'DARAZ_AWB_SKIPPED', message: 'No selected Daraz orders were eligible for AWB.', meta: result }).catch(() => null);
    return result;
  }

  for (const [accountId, rawAccountOrders] of grouped.entries()) {
    try {
      const account = await getAccountForDarazOrder(rawAccountOrders[0]);
      const accountOrders = [];
      for (const order of rawAccountOrders) accountOrders.push(packageIds(order).length ? order : await refreshOrderItemsFromDaraz(account, order));

      let response = null;
      let document = null;
      let source = 'package_document';
      let packageError = null;

      try {
        response = await printPackageDocument(account, accountOrders, payload);
        document = response?.document || null;
      } catch (error) {
        packageError = error.message;
      }

      if (!document) {
        source = 'legacy_order_document';
        const legacyDocs = [];
        const legacyAttempts = [];
        for (const order of accountOrders) {
          const legacy = await printLegacyOrderDocument(account, order, payload);
          if (legacy?.attempts) legacyAttempts.push({ order_id: order.id, attempts: legacy.attempts });
          if (legacy?.document) {
            const savedId = await saveDarazDocument(order, legacy.document, source);
            legacyDocs.push({ order_id: order.id, account_id: accountId, source, document: withDocumentPointers(legacy.document, savedId), response: legacy.body, path: legacy.path });
          }
        }
        result.documents.push(...legacyDocs);
        if (!legacyDocs.length) {
          result.errors.push({ account_id: accountId, message: packageError || 'Daraz AWB document not returned. Check Daraz API log for document endpoint response.', legacy_attempts: legacyAttempts });
        }
      } else {
        for (const order of accountOrders) {
          const savedId = await saveDarazDocument(order, document, source);
          result.documents.push({ order_id: order.id, account_id: accountId, source, document: withDocumentPointers(document, savedId), response: response.body });
        }
      }

      if (!result.document && result.documents.length) {
        result.document = result.documents[0].document;
        result.pdf_url = result.document?.pdf_url || null;
        result.file_base64 = result.document?.file_base64 || null;
        result.mime_type = result.document?.mime_type || null;
        result.data_url = result.document?.data_url || null;
      }

      await writeSystemLog({ action: 'DARAZ_PRINT_AWB', message: `Daraz AWB requested for ${accountOrders.length} orders`, meta: { documents: result.documents, packageError } }).catch(() => null);
    } catch (error) {
      result.errors.push({ account_id: accountId, message: error.message });
    }
  }

  return result;
}

async function setDarazInvoiceNumbers({ order_ids = [], invoice_prefix = 'INV' } = {}) {
  const orders = await getDarazOrdersByLocalIds(order_ids);
  const result = { action: 'set_invoice_number', total: 0, documents: [], errors: [] };
  for (const order of orders) {
    try {
      const account = await getAccountForDarazOrder(order);
      const items = order.items || [];
      for (const item of items) {
        if (!item.daraz_order_item_id) continue;
        const invoiceNo = `${invoice_prefix}-${order.order_number || order.daraz_order_id}-${item.daraz_order_item_id}`.replace(/\s+/g, '');
        const body = await callDaraz(account, process.env.DARAZ_SET_INVOICE_PATH || '/order/invoice_number/set', {
          order_item_id: item.daraz_order_item_id,
          invoice_number: invoiceNo,
        }, 'POST');
        result.total += 1;
        result.documents.push({ order_id: order.id, order_item_id: item.daraz_order_item_id, invoice_number: invoiceNo, response: body });
      }
    } catch (error) {
      result.errors.push({ order_id: order.id, message: error.message });
    }
  }
  return result;
}

async function darazBulkAction(payload = {}) {
  const action = clean(payload.action).toLowerCase();
  if (action === 'pack') return packDarazOrders(payload);
  if (action === 'ready_to_ship' || action === 'rts') return readyToShipDarazOrders(payload);
  if (action === 'print_awb' || action === 'awb') return printAwbDarazOrders(payload);
  if (action === 'set_invoice_number' || action === 'invoice') return setDarazInvoiceNumbers(payload);
  throw Object.assign(new Error('Invalid Daraz action. Use pack, ready_to_ship, print_awb, or set_invoice_number.'), { statusCode: 400 });
}

module.exports = {
  darazBulkAction,
  packDarazOrders,
  readyToShipDarazOrders,
  printAwbDarazOrders,
  setDarazInvoiceNumbers,
};
