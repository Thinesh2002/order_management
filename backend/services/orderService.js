const { orderDb } = require('../config/db');
const { toNumber, toInt, clean, safeJson } = require('../utils/dbUtils');
const { upsertCustomer } = require('./customerService');
const { deductStockForOrderItem } = require('./inventoryStockService');
const { writeOrderLog, writeSystemLog } = require('./logService');
const { createWaybill, addManualWaybill } = require('./transExpressService');
const { enrichDarazOrderDetail } = require('./darazOrderDetailService');

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'to_pack', label: 'To Pack' },
  { key: 'to_arrange', label: 'To Arrange Shipment' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

function normalizeStatusKey(status = '') {
  const raw = Array.isArray(status) ? status.join(' ') : clean(status);
  const s = raw.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (!s) return 'new';
  if (['new', 'pending', 'unpaid', 'created', 'to_confirm'].includes(s)) return 'new';
  if (['topack', 'to_pack', 'to__pack', 'processing', 'confirmed'].includes(s)) return 'to_pack';
  if (['to_arrange_shipment', 'arrange_shipment', 'packed', 'packed_by_seller'].includes(s) || s.includes('arrange')) return 'to_arrange';
  if (['ready_to_ship', 'readytoship', 'ready_to_ship_pending', 'rts', 'ready'].includes(s)) return 'ready_to_ship';
  if (['dispatched', 'shipped', 'shipping', 'in_transit', 'intransit', 'to_ship', 'toship'].includes(s)) return 'shipped';
  if (s.includes('deliver') || s === 'completed') return 'delivered';
  if (s.includes('return')) return 'returned';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('fail')) return 'cancelled';
  if (s.includes('hold') || s.includes('problem')) return 'hold';
  if (s.includes('ready')) return 'ready_to_ship';
  if (s.includes('pack')) return 'to_arrange';
  if (s.includes('ship') || s.includes('dispatch')) return 'shipped';
  if (s.includes('pending')) return 'new';
  return s;
}

function displayStatus(status = '') {
  const key = normalizeStatusKey(status);
  const found = STATUS_TABS.find((tab) => tab.key === key);
  return found ? found.label : clean(status || 'Pending');
}

function sourceLabel({ source, source_type, account_name, account_code }) {
  const name = clean(account_name || account_code).toLowerCase().replace(/\s+/g, '_');
  if (source === 'manual') {
    const manual = clean(source_type || 'MANUAL_OTHER').toLowerCase().replace('manual_', 'manual_');
    return name && manual !== 'manual_whatsapp' ? `${manual}_${name}` : manual;
  }
  if (source === 'daraz') return `daraz${name ? `_${name}` : ''}`;
  if (source === 'woo') return `woo${name ? `_${name}` : ''}`;
  return clean(source || 'order');
}

function groupRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.source}:${row.source_order_id}`;
    if (!map.has(key)) {
      map.set(key, {
        ...row,
        display_status: displayStatus(row.order_status),
        status_key: normalizeStatusKey(row.order_status),
        source_label: sourceLabel(row),
        items: [],
      });
    }
    if (row.item_id) {
      map.get(key).items.push({
        id: row.item_id,
        sku: row.sku,
        local_sku: row.local_sku,
        marketplace_sku: row.marketplace_sku,
        product_title: row.product_title,
        product_image_url: row.product_image_url,
        qty: row.qty,
        unit_price: row.unit_price,
        line_total: row.line_total,
        item_status: row.item_status,
        stock_deducted: row.stock_deducted,
      });
    }
  }
  return [...map.values()].map((order) => ({
    ...order,
    first_item: order.items[0] || null,
    item_count: order.items.reduce((sum, item) => sum + toInt(item.qty, 0), 0),
  }));
}

function matchSearch(order, q) {
  if (!q) return true;
  const text = [
    order.display_order_no,
    order.order_no,
    order.customer_name,
    order.customer_phone,
    order.customer_email,
    order.shipping_address,
    order.shipping_city,
    order.source_label,
    order.account_code,
    order.account_name,
    order.waybill_id,
    order.tracking_number,
    ...order.items.flatMap((item) => [item.sku, item.local_sku, item.marketplace_sku, item.product_title]),
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(q.toLowerCase());
}

async function listUnifiedOrders(params = {}) {
  const source = clean(params.source || 'all').toLowerCase();
  const tab = normalizeStatusKey(params.status || params.tab || 'all');
  const search = clean(params.search || '');
  const page = Math.max(toInt(params.page, 1), 1);
  const limit = Math.min(Math.max(toInt(params.limit, 30), 1), 200);

  const rows = [];

  if (source === 'all' || source === 'manual') {
    const [manual] = await orderDb.query(
      `SELECT
        'manual' AS source, 'MANUAL' AS api_source_type, o.id AS source_order_id, o.order_no AS display_order_no, o.order_no,
        o.source_type, o.account_id, o.account_code, o.account_name, o.order_status, o.payment_status, o.payment_method,
        o.order_date, o.item_total, o.discount_total, o.shipping_fee, o.cod_fee, o.tax_total, o.grand_total, o.currency,
        c.id AS customer_id, c.customer_name, c.phone AS customer_phone, c.email AS customer_email,
        c.shipping_full_name AS shipping_name, c.shipping_phone, CONCAT_WS(', ', c.shipping_address_line1, c.shipping_address_line2) AS shipping_address,
        c.shipping_city, c.shipping_district, c.shipping_province, c.shipping_postal_code, c.shipping_country,
        w.id AS waybill_row_id, w.waybill_id, w.tracking_number, w.courier_status,
        i.id AS item_id, i.sku, i.local_sku, NULL AS marketplace_sku, i.product_title, i.product_image_url, i.qty, i.unit_price, i.line_total, i.item_status, i.stock_deducted
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN trans_express_waybills w ON w.source_type = 'MANUAL' AND w.source_order_id = o.id
       LEFT JOIN order_items i ON i.order_id = o.id
       ORDER BY o.order_date DESC, o.id DESC`,
    );
    rows.push(...manual);
  }

  if (source === 'all' || source === 'daraz') {
    const [daraz] = await orderDb.query(
      `SELECT
        'daraz' AS source, 'DARAZ' AS api_source_type, o.id AS source_order_id, COALESCE(o.order_number, o.daraz_order_id) AS display_order_no, o.daraz_order_id AS order_no,
        'DARAZ' AS source_type, o.account_id, o.account_code, o.account_name, o.order_status, o.payment_status, o.payment_method,
        COALESCE(o.order_date, o.created_time) AS order_date, o.item_total, o.discount_total, o.shipping_fee, 0 AS cod_fee, 0 AS tax_total, o.grand_total, o.currency,
        c.id AS customer_id, COALESCE(c.customer_name, o.buyer_name, o.shipping_name) AS customer_name, COALESCE(c.phone, o.buyer_phone, o.shipping_phone) AS customer_phone, c.email AS customer_email,
        COALESCE(c.shipping_full_name, o.shipping_name) AS shipping_name, COALESCE(c.shipping_phone, o.shipping_phone) AS shipping_phone,
        COALESCE(NULLIF(CONCAT_WS(', ', c.shipping_address_line1, c.shipping_address_line2), ''), o.shipping_address) AS shipping_address,
        COALESCE(c.shipping_city, o.shipping_city) AS shipping_city, c.shipping_district, COALESCE(c.shipping_province, o.shipping_region) AS shipping_province, c.shipping_postal_code, COALESCE(c.shipping_country, 'Sri Lanka') AS shipping_country,
        w.id AS waybill_row_id, w.waybill_id, COALESCE(w.tracking_number, i.tracking_code) AS tracking_number, w.courier_status,
        i.id AS item_id, COALESCE(i.seller_sku, i.marketplace_sku, i.local_sku) AS sku, i.local_sku, i.marketplace_sku, i.product_title, i.product_image_url, i.qty, i.unit_price, i.line_total, i.item_status, i.stock_deducted
       FROM daraz_orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN trans_express_waybills w ON w.source_type = 'DARAZ' AND w.source_order_id = o.id
       LEFT JOIN daraz_order_items i ON i.daraz_order_id = o.id
       ORDER BY COALESCE(o.order_date, o.created_time) DESC, o.id DESC`,
    );
    rows.push(...daraz);
  }

  if (source === 'all' || source === 'woo') {
    const [woo] = await orderDb.query(
      `SELECT
        'woo' AS source, 'WOO' AS api_source_type, o.id AS source_order_id, COALESCE(o.order_number, o.woo_order_id) AS display_order_no, o.woo_order_id AS order_no,
        'WOO' AS source_type, o.account_id, o.account_code, o.account_name, o.order_status, o.payment_status, o.payment_method,
        COALESCE(o.order_date, o.created_time) AS order_date, o.item_total, o.discount_total, o.shipping_fee, 0 AS cod_fee, o.tax_total, o.grand_total, o.currency,
        c.id AS customer_id, COALESCE(c.customer_name, o.buyer_name, o.shipping_name) AS customer_name, COALESCE(c.phone, o.buyer_phone, o.shipping_phone) AS customer_phone, COALESCE(c.email, o.buyer_email) AS customer_email,
        COALESCE(c.shipping_full_name, o.shipping_name) AS shipping_name, COALESCE(c.shipping_phone, o.shipping_phone) AS shipping_phone,
        COALESCE(NULLIF(CONCAT_WS(', ', c.shipping_address_line1, c.shipping_address_line2), ''), o.shipping_address) AS shipping_address,
        COALESCE(c.shipping_city, o.shipping_city) AS shipping_city, c.shipping_district, COALESCE(c.shipping_province, o.shipping_region) AS shipping_province, c.shipping_postal_code, COALESCE(c.shipping_country, 'Sri Lanka') AS shipping_country,
        w.id AS waybill_row_id, w.waybill_id, w.tracking_number, w.courier_status,
        i.id AS item_id, COALESCE(i.sku, i.marketplace_sku, i.local_sku) AS sku, i.local_sku, i.marketplace_sku, i.product_title, i.product_image_url, i.qty, i.unit_price, i.line_total, i.item_status, i.stock_deducted
       FROM woo_orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN trans_express_waybills w ON w.source_type = 'WOO' AND w.source_order_id = o.id
       LEFT JOIN woo_order_items i ON i.woo_order_id = o.id
       ORDER BY COALESCE(o.order_date, o.created_time) DESC, o.id DESC`,
    );
    rows.push(...woo);
  }

  let grouped = groupRows(rows);
  if (tab !== 'all') grouped = grouped.filter((order) => order.status_key === tab);
  if (search) grouped = grouped.filter((order) => matchSearch(order, search));

  const counts = STATUS_TABS.reduce((acc, item) => ({ ...acc, [item.key]: 0 }), {});
  const sourceCounts = { all: grouped.length, manual: 0, daraz: 0, woo: 0 };
  for (const order of groupRows(rows).filter((order) => !search || matchSearch(order, search))) {
    const key = normalizeStatusKey(order.order_status);
    counts.all += 1;
    if (counts[key] !== undefined) counts[key] += 1;
    sourceCounts[order.source] += 1;
  }

  const total = grouped.length;
  const start = (page - 1) * limit;
  const data = grouped.slice(start, start + limit);

  return { data, counts, source_counts: sourceCounts, tabs: STATUS_TABS, pagination: { page, limit, total } };
}

async function generateManualOrderNo(connection, prefix = 'BH') {
  const cleanPrefix = clean(prefix || 'BH').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BH';
  const like = `${cleanPrefix}%`;
  const regexp = `^${cleanPrefix}[0-9]+$`;
  const [rows] = await connection.query(
    `SELECT order_no
     FROM orders
     WHERE order_no LIKE ? AND order_no REGEXP ?
     ORDER BY CAST(SUBSTRING(order_no, ?) AS UNSIGNED) DESC
     LIMIT 1`,
    [like, regexp, cleanPrefix.length + 1],
  );
  const lastNo = rows[0]?.order_no || '';
  const lastNumber = Number(String(lastNo).slice(cleanPrefix.length)) || 0;
  return `${cleanPrefix}${String(lastNumber + 1).padStart(4, '0')}`;
}

async function createManualOrder(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw Object.assign(new Error('At least one item is required.'), { statusCode: 400 });

  const incomingCustomer = payload.customer || {};
  const primaryPhone = clean(incomingCustomer.phone || incomingCustomer.phone_1 || incomingCustomer.phone1 || incomingCustomer.mobile || incomingCustomer.customer_phone || payload.phone);
  const secondaryPhone = clean(incomingCustomer.phone_alt || incomingCustomer.phone_2 || incomingCustomer.phone2 || incomingCustomer.secondary_phone || payload.phone_alt);
  if (!primaryPhone) {
    throw Object.assign(new Error('Customer Phone Number 1 is required.'), { statusCode: 400 });
  }

  payload.customer = {
    ...incomingCustomer,
    phone: primaryPhone,
    phone_alt: secondaryPhone || null,
    shipping_phone: incomingCustomer.shipping_phone || primaryPhone,
  };
  payload.shipping = {
    ...(payload.shipping || {}),
    shipping_phone: payload.shipping?.shipping_phone || primaryPhone,
  };

  const connection = await orderDb.getConnection();
  let orderId;
  let insertedItems = [];
  try {
    await connection.beginTransaction();
    const itemTotal = items.reduce((sum, item) => sum + (toNumber(item.unit_price) * toInt(item.qty, 1)), 0);
    const discountTotal = toNumber(payload.discount_total, 0);
    const shippingFee = toNumber(payload.shipping_fee, 0);
    const codFee = toNumber(payload.cod_fee, 0);
    const taxTotal = toNumber(payload.tax_total, 0);
    const grandTotal = itemTotal - discountTotal + shippingFee + codFee + taxTotal;

    const customerId = await upsertCustomer(connection, {
      ...payload.customer,
      ...payload.shipping,
      source_type: 'MANUAL',
      source_account_id: payload.account_id || null,
      source_account_code: payload.account_code || null,
      source_account_name: payload.account_name || null,
      order_total: grandTotal,
    });

    const orderNo = clean(payload.order_no) || await generateManualOrderNo(connection, clean(process.env.MANUAL_ORDER_PREFIX || 'BH'));
    const sourceType = clean(payload.source_type || 'MANUAL_OTHER').toUpperCase();
    const manualSourceLabel = sourceLabel({ source: 'manual', source_type: sourceType, account_name: payload.account_name, account_code: payload.account_code });

    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_no, customer_id, source_type, source_label, account_id, account_code, account_name, customer_order_ref,
         order_status, payment_status, payment_method, order_date, item_total, discount_total, shipping_fee, cod_fee, tax_total, grand_total,
         currency, customer_note, internal_note, raw_payload, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNo,
        customerId,
        sourceType,
        manualSourceLabel,
        payload.account_id || null,
        payload.account_code || null,
        payload.account_name || null,
        payload.customer_order_ref || null,
        payload.order_status || 'Pending',
        payload.payment_status || 'Unpaid',
        payload.payment_method || null,
        payload.order_date ? new Date(payload.order_date) : new Date(),
        itemTotal,
        discountTotal,
        shippingFee,
        codFee,
        taxTotal,
        grandTotal,
        payload.currency || 'LKR',
        payload.customer_note || null,
        payload.internal_note || null,
        safeJson(payload),
        payload.created_by || null,
      ],
    );
    orderId = orderResult.insertId;

    for (const item of items) {
      const qty = Math.max(toInt(item.qty, 1), 1);
      const unitPrice = toNumber(item.unit_price, 0);
      const discount = toNumber(item.discount_amount, 0);
      const lineTotal = (qty * unitPrice) - discount;
      const [itemResult] = await connection.query(
        `INSERT INTO order_items
          (order_id, product_id, variant_id, local_sku, sku, product_title, variation_name, product_image_url,
           qty, unit_price, discount_amount, line_total, item_status, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id || null,
          item.variant_id || null,
          item.local_sku || item.sku,
          item.sku,
          item.product_title || item.title || item.sku,
          item.variation_name || null,
          item.product_image_url || item.image_url || null,
          qty,
          unitPrice,
          discount,
          lineTotal,
          item.item_status || 'Pending',
          safeJson(item),
        ],
      );
      insertedItems.push({ id: itemResult.insertId, ...item, qty });
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const item of insertedItems) {
    const deduction = await deductStockForOrderItem({
      source_type: 'MANUAL',
      source_order_id: orderId,
      source_item_id: item.id,
      platform: 'MANUAL',
      account_id: payload.account_id,
      account_code: payload.account_code,
      sku: item.sku,
      local_sku: item.local_sku || item.sku,
      qty: item.qty,
      created_by: payload.created_by || null,
    });
    if (deduction.deducted) {
      await orderDb.query(
        'UPDATE order_items SET stock_deducted = 1, stock_deducted_at = NOW(), stock_movement_id = ? WHERE id = ?',
        [deduction.movement_id, item.id],
      );
    }
  }

  await writeOrderLog({ source_type: 'MANUAL', source_order_id: orderId, order_no: orderNo, event_type: 'ORDER_CREATED', message: `Manual order created: ${orderNo}`, created_by: payload.created_by || null });
  return getOrderDetail('manual', orderId);
}

async function getOrderDetail(source, id, options = {}) {
  const result = await listUnifiedOrders({ source, limit: 5000 });
  const order = result.data.find((row) => String(row.source_order_id) === String(id));
  if (!order) return null;
  if (String(source).toLowerCase() === 'daraz') return enrichDarazOrderDetail(order, options);
  return order;
}

async function updateManualOrderStatus(orderId, status, userId = null, options = {}) {
  const [[existing]] = await orderDb.query('SELECT order_status, order_no, source_type FROM orders WHERE id = ?', [orderId]);
  if (!existing) throw Object.assign(new Error('Manual order not found.'), { statusCode: 404 });

  const nextKey = normalizeStatusKey(status);
  const isOtherManual = String(existing.source_type || '').toUpperCase() === 'MANUAL_OTHER';
  if (nextKey === 'dispatched' && !isOtherManual) {
    const [[waybill]] = await orderDb.query("SELECT id FROM trans_express_waybills WHERE source_type = 'MANUAL' AND source_order_id = ? LIMIT 1", [orderId]);
    if (!waybill && !clean(options.waybill_id)) {
      throw Object.assign(new Error('Waybill ID is required before moving this manual order to shipped/dispatched.'), { statusCode: 400, code: 'WAYBILL_REQUIRED' });
    }
    if (!waybill && clean(options.waybill_id)) {
      await createWaybillForOrder('manual', orderId, userId, { waybill_id: options.waybill_id, courier_status: 'Created Manual' });
    }
  }

  await orderDb.query('UPDATE orders SET order_status = ?, shipped_at = IF(?, NOW(), shipped_at), updated_by = ?, updated_at = NOW() WHERE id = ?', [status, nextKey === 'dispatched' ? 1 : 0, userId, orderId]);
  await writeOrderLog({ source_type: 'MANUAL', source_order_id: orderId, order_no: existing.order_no, event_type: 'STATUS_UPDATED', old_value: existing.order_status, new_value: status, message: `Manual order status changed to ${status}`, created_by: userId });
  return getOrderDetail('manual', orderId);
}

async function createWaybillForOrder(source, id, userId = null, options = {}) {
  const order = await getOrderDetail(source, id);
  if (!order) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
  let waybill;
  if (clean(options.waybill_id)) {
    waybill = await addManualWaybill({
      ...order,
      source_type: order.api_source_type,
      source_order_id: order.source_order_id,
      created_by: userId,
      waybill_id: clean(options.waybill_id),
      tracking_number: clean(options.tracking_number || options.waybill_id),
      courier_status: options.courier_status || 'Created Manual',
    });
  } else {
    waybill = await createWaybill({
      ...order,
      source_type: order.api_source_type,
      source_order_id: order.source_order_id,
      created_by: userId,
    });
  }
  await writeOrderLog({ source_type: order.api_source_type, source_order_id: id, order_no: order.display_order_no, event_type: 'WAYBILL_CREATED', message: `Waybill created: ${waybill.waybill_id}`, created_by: userId });
  return waybill;
}

async function getDashboardSummary() {
  const result = await listUnifiedOrders({ limit: 10000 });
  const orders = result.data;
  return {
    total_orders: result.pagination.total,
    total_value: orders.reduce((sum, order) => sum + Number(order.grand_total || 0), 0),
    pending: result.counts.pending || 0,
    delivered: result.counts.delivered || 0,
    cancelled: result.counts.cancelled || 0,
    returned: result.counts.returned || 0,
    source_counts: result.source_counts,
  };
}

async function saveExternalDarazOrder(payload = {}) {
  await writeSystemLog({ action: 'DARAZ_ORDER_SYNC_PLACEHOLDER', message: 'Use existing Daraz sync service or post normalized order payload here.', meta: payload });
  return { message: 'Daraz sync hook ready. Connect existing Daraz service to daraz_orders/daraz_order_items tables.' };
}

module.exports = {
  STATUS_TABS,
  listUnifiedOrders,
  createManualOrder,
  getOrderDetail,
  updateManualOrderStatus,
  createWaybillForOrder,
  getDashboardSummary,
  saveExternalDarazOrder,
};
