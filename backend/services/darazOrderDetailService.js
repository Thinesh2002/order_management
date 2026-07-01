const { orderDb } = require('../config/db');
const { clean, safeJson, parseMaybeJson } = require('../utils/dbUtils');
const { getMarketplaceAccountById } = require('./marketplaceAccountService');
const { callDaraz, findArrayWithKeys, documentFromResponse } = require('./darazClientService');
const { writeOrderLog } = require('./logService');

function pick(obj = {}, keys = [], fallback = null) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function orderDateWindow(order) {
  const base = order.order_date || order.created_time || order.created_at || new Date();
  const start = new Date(base);
  if (Number.isNaN(start.getTime())) start.setTime(Date.now());
  start.setDate(start.getDate() - 7);
  const end = new Date(base);
  if (Number.isNaN(end.getTime())) end.setTime(Date.now());
  end.setDate(end.getDate() + 45);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start_time: fmt(start), end_time: fmt(end) };
}

function packageIds(items = []) {
  return [...new Set(items.map((item) => item.package_id || item.ofc_package_id).filter(Boolean).map(String))];
}

function orderItemIds(items = []) {
  return [...new Set(items.map((item) => item.daraz_order_item_id || item.order_item_id).filter(Boolean).map(String))];
}

async function saveTransactions(order, rows = []) {
  for (const row of rows) {
    try {
      await orderDb.query(
        `INSERT INTO daraz_order_transactions
          (daraz_order_id, account_id, account_code, trade_order_id, trade_order_line_id, order_no, order_item_no,
           transaction_number, transaction_date, transaction_type, fee_type, fee_name, amount, paid_status,
           seller_sku, lazada_sku, shipping_provider, shipment_type, reference, statement, details, comment, raw_payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           transaction_date = VALUES(transaction_date), transaction_type = VALUES(transaction_type), fee_type = VALUES(fee_type), fee_name = VALUES(fee_name), amount = VALUES(amount), paid_status = VALUES(paid_status), seller_sku = VALUES(seller_sku), lazada_sku = VALUES(lazada_sku), shipping_provider = VALUES(shipping_provider), shipment_type = VALUES(shipment_type), reference = VALUES(reference), statement = VALUES(statement), details = VALUES(details), comment = VALUES(comment), raw_payload = VALUES(raw_payload), updated_at = NOW()`,
        [
          order.id,
          order.account_id,
          order.account_code,
          pick(row, ['trade_order_id', 'order_no'], order.daraz_order_id),
          pick(row, ['trade_order_line_id', 'orderItem_no', 'orderItem_no'], null),
          pick(row, ['order_no'], order.order_number || order.daraz_order_id),
          pick(row, ['orderItem_no', 'order_item_no'], null),
          pick(row, ['transaction_number'], null),
          pick(row, ['transaction_date'], null),
          pick(row, ['transaction_type'], null),
          pick(row, ['fee_type'], null),
          pick(row, ['fee_name'], null),
          pick(row, ['amount'], null),
          pick(row, ['paid_status'], null),
          pick(row, ['seller_sku'], null),
          pick(row, ['lazada_sku'], null),
          pick(row, ['shipping_provider'], null),
          pick(row, ['shipment_type'], null),
          pick(row, ['reference'], null),
          pick(row, ['statement'], null),
          pick(row, ['details'], null),
          pick(row, ['comment'], null),
          safeJson(row),
        ],
      );
    } catch (_error) {
      // Missing optional table/column should not break order detail view.
    }
  }
}

async function saveLogisticSnapshot(order, endpoint, body) {
  try {
    await orderDb.query(
      `INSERT INTO daraz_order_logistic_snapshots
        (daraz_order_id, account_id, account_code, endpoint, raw_payload, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [order.id, order.account_id, order.account_code, endpoint, safeJson(body)],
    );
  } catch (_error) {
    // Optional table only.
  }
}

async function readCachedExtras(orderId) {
  const extras = { transactions: [], documents: [], logistic_snapshots: [] };
  try {
    const [rows] = await orderDb.query('SELECT * FROM daraz_order_transactions WHERE daraz_order_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 500', [orderId]);
    extras.transactions = rows;
  } catch (_error) {}
  try {
    const [rows] = await orderDb.query('SELECT id, document_type, doc_type, mime_type, pdf_url, LEFT(file_base64, 40) AS file_preview, source, created_at FROM daraz_order_documents WHERE daraz_order_id = ? ORDER BY id DESC LIMIT 20', [orderId]);
    extras.documents = rows;
  } catch (_error) {}
  try {
    const [rows] = await orderDb.query('SELECT id, endpoint, raw_payload, created_at FROM daraz_order_logistic_snapshots WHERE daraz_order_id = ? ORDER BY id DESC LIMIT 20', [orderId]);
    extras.logistic_snapshots = rows.map((row) => ({ ...row, raw_payload: parseMaybeJson(row.raw_payload, row.raw_payload) }));
  } catch (_error) {}
  return extras;
}

async function updateLiveItems(order, body) {
  const rows = findArrayWithKeys(body, ['order_item_id', 'orderItemId', 'sku', 'seller_sku', 'package_id']);
  for (const item of rows) {
    const orderItemId = clean(pick(item, ['order_item_id', 'orderItemId', 'id'], ''));
    if (!orderItemId) continue;
    try {
      await orderDb.query(
        `UPDATE daraz_order_items
         SET package_id = COALESCE(NULLIF(?, ''), package_id),
             tracking_code = COALESCE(NULLIF(?, ''), tracking_code),
             shipment_provider = COALESCE(NULLIF(?, ''), shipment_provider),
             item_status = COALESCE(NULLIF(?, ''), item_status),
             raw_payload = ?,
             updated_at = NOW()
         WHERE daraz_order_id = ? AND daraz_order_item_id = ?`,
        [
          clean(pick(item, ['package_id', 'ofc_package_id'], '')),
          clean(pick(item, ['tracking_code', 'tracking_number'], '')),
          clean(pick(item, ['shipment_provider'], '')),
          clean(pick(item, ['status', 'item_status'], '')),
          safeJson(item),
          order.id,
          orderItemId,
        ],
      );
    } catch (_error) {}
  }
  return rows;
}

async function fetchLiveDarazDetail(order, items) {
  const account = await getMarketplaceAccountById(order.account_id);
  if (!account) throw new Error(`Marketplace account not found for Daraz account ID ${order.account_id}`);

  const detail = {
    account: {
      account_id: account.account_id,
      account_code: account.account_code,
      account_name: account.account_name,
    },
    api_paths: {
      get_order: process.env.DARAZ_ORDER_GET_PATH || '/order/get',
      get_items: process.env.DARAZ_ORDER_ITEMS_GET_PATH || '/order/items/get',
      logistics: process.env.DARAZ_ORDER_LOGISTIC_PATH || '/order/logistic/get',
      trace: process.env.DARAZ_ORDER_TRACE_PATH || '/logistic/order/trace',
      finance: process.env.DARAZ_FINANCE_TRANSACTION_PATH || '/finance/transaction/details/get',
      package_document: process.env.DARAZ_PRINT_AWB_PATH || '/order/package/document/get',
      legacy_document: process.env.DARAZ_LEGACY_DOCUMENT_PATH || '/order/document/get',
    },
    live_order: null,
    live_items: [],
    logistics: null,
    trace: null,
    finance_transactions: [],
    document_preview: null,
    errors: [],
    refreshed_at: new Date().toISOString(),
  };

  try {
    detail.live_order = await callDaraz(account, detail.api_paths.get_order, { order_id: String(order.daraz_order_id) }, 'GET');
  } catch (error) {
    detail.errors.push({ api: detail.api_paths.get_order, message: error.message });
  }

  try {
    const itemBody = await callDaraz(account, detail.api_paths.get_items, { order_id: String(order.daraz_order_id) }, 'GET');
    detail.live_items = await updateLiveItems(order, itemBody);
  } catch (error) {
    detail.errors.push({ api: detail.api_paths.get_items, message: error.message });
  }

  const freshItems = detail.live_items.length ? detail.live_items : items;
  const packages = packageIds(freshItems);

  if (packages.length) {
    try {
      detail.logistics = await callDaraz(account, detail.api_paths.logistics, {
        order_id: String(order.daraz_order_id),
        package_id_list: JSON.stringify(packages),
        locale: 'en',
      }, 'POST');
      await saveLogisticSnapshot(order, detail.api_paths.logistics, detail.logistics);
    } catch (error) {
      detail.errors.push({ api: detail.api_paths.logistics, message: error.message });
    }

    try {
      detail.trace = await callDaraz(account, detail.api_paths.trace, {
        order_id: String(order.daraz_order_id),
        locale: 'en',
        ofcPackageIdList: JSON.stringify(packages),
      }, 'POST');
      await saveLogisticSnapshot(order, detail.api_paths.trace, detail.trace);
    } catch (error) {
      detail.errors.push({ api: detail.api_paths.trace, message: error.message });
    }
  }

  try {
    const dateRange = orderDateWindow(order);
    const financeBody = await callDaraz(account, detail.api_paths.finance, {
      offset: '0',
      limit: '500',
      start_time: dateRange.start_time,
      end_time: dateRange.end_time,
      trade_order_id: String(order.daraz_order_id),
    }, 'GET');
    detail.finance_raw = financeBody;
    detail.finance_transactions = Array.isArray(financeBody?.data)
      ? financeBody.data
      : findArrayWithKeys(financeBody, ['transaction_number', 'transaction_type', 'fee_type', 'amount']);
    await saveTransactions(order, detail.finance_transactions);
  } catch (error) {
    detail.errors.push({ api: detail.api_paths.finance, message: error.message });
  }

  try {
    const ids = orderItemIds(freshItems);
    if (ids.length) {
      const documentBody = await callDaraz(account, detail.api_paths.legacy_document, {
        doc_type: 'shippingLabel',
        order_item_ids: JSON.stringify(ids),
      }, 'GET');
      detail.document_preview = documentFromResponse(documentBody, { doc_type: 'shippingLabel', document_type: 'shippingLabel' });
    }
  } catch (error) {
    detail.errors.push({ api: detail.api_paths.legacy_document, message: error.message });
  }

  await writeOrderLog({
    source_type: 'DARAZ',
    source_order_id: order.id,
    order_no: order.order_number || order.daraz_order_id,
    event_type: 'DARAZ_DETAIL_VIEW',
    message: 'Daraz order detail data refreshed/viewed.',
    meta: { errors: detail.errors, api_paths: detail.api_paths },
  }).catch(() => null);

  return detail;
}

async function enrichDarazOrderDetail(order, options = {}) {
  if (!order || order.source !== 'daraz') return order;

  const [[dbOrder]] = await orderDb.query('SELECT * FROM daraz_orders WHERE id = ? LIMIT 1', [order.source_order_id]);
  const [items] = await orderDb.query('SELECT * FROM daraz_order_items WHERE daraz_order_id = ? ORDER BY id ASC', [order.source_order_id]);
  const cached = await readCachedExtras(order.source_order_id);

  const enriched = {
    ...order,
    daraz_order: dbOrder || null,
    raw_payload: parseMaybeJson(dbOrder?.raw_payload, dbOrder?.raw_payload),
    items: items.length ? items.map((item) => ({ ...item, raw_payload: parseMaybeJson(item.raw_payload, item.raw_payload) })) : order.items,
    daraz_cached: cached,
  };

  if (String(options.refresh || '1') !== '0') {
    try {
      enriched.daraz_live = await fetchLiveDarazDetail(dbOrder || { ...order, id: order.source_order_id }, enriched.items || []);
      if (enriched.daraz_live?.finance_transactions?.length) {
        enriched.daraz_cached.transactions = enriched.daraz_live.finance_transactions;
      }
    } catch (error) {
      enriched.daraz_live = { errors: [{ message: error.message }] };
    }
  }

  return enriched;
}

module.exports = {
  enrichDarazOrderDetail,
};
