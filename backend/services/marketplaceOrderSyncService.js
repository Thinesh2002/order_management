const axios = require('axios');
const crypto = require('crypto');
const { orderDb } = require('../config/db');
const { clean, safeJson, toNumber, toInt } = require('../utils/dbUtils');
const { upsertCustomer } = require('./customerService');
const { deductStockForOrderItem } = require('./inventoryStockService');
const { writeSystemLog, writeOrderLog, writeDarazApiLog } = require('./logService');
const {
  listMarketplaceAccounts,
  getCredentialRows,
  updateAccountOrderSync,
} = require('./marketplaceAccountService');

function isoMysql(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function darazDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}+0000`;
}

function mysqlDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function deepFindArray(input, keys = []) {
  const wanted = new Set(keys.map((k) => String(k).toLowerCase()));
  const queue = [input];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object') continue;
    if (seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) return value;
    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(String(key).toLowerCase()) && Array.isArray(child)) return child;
      if (child && typeof child === 'object') queue.push(child);
    }
  }
  return [];
}

function pick(obj, keys, fallback = null) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}

function getAddressObject(order, key) {
  const value = order?.[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

function cleanText(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return clean(value);
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return joinAddressParts(value.address1, value.address2, value.address3, value.address4, value.address5, value.address_1, value.address_2, value.city, value.state, value.region, value.post_code, value.postcode, value.postal_code, value.country) || '';
  }
  return clean(value);
}

function joinAddressParts(...parts) {
  return parts.map(cleanText).filter(Boolean).join(', ') || null;
}

function parsePositiveNumber(value, fallback, min = 1, max = 100000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseDateInput(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAccountFilters(options = {}) {
  const values = [];
  if (options.account_id) values.push(options.account_id);
  if (options.accountId) values.push(options.accountId);
  if (options.account_ids) {
    if (Array.isArray(options.account_ids)) values.push(...options.account_ids);
    else values.push(...String(options.account_ids).split(','));
  }
  const ids = new Set(values.map((value) => clean(value)).filter(Boolean));
  const code = clean(options.account_code || options.accountCode || '');
  return { ids, code };
}

function filterAccounts(accounts = [], options = {}) {
  const { ids, code } = parseAccountFilters(options);
  return accounts.filter((account) => {
    if (ids.size && !ids.has(String(account.account_id))) return false;
    if (code && String(account.account_code || '').toLowerCase() !== code.toLowerCase()) return false;
    return true;
  });
}

async function getSyncConfig(platformCode, options = {}) {
  const [[row]] = await orderDb.query(
    'SELECT * FROM order_sync_settings WHERE platform_code = ? LIMIT 1',
    [String(platformCode || '').toUpperCase()],
  ).catch(() => [[null]]);

  const days = parsePositiveNumber(
    options.days || options.fetch_order_days || row?.fetch_order_days || process.env.ORDER_SYNC_DAYS_BACK,
    7,
    1,
    3650,
  );
  const limit = parsePositiveNumber(options.limit || row?.sync_limit || process.env.ORDER_SYNC_LIMIT, 50, 1, 100);
  const interval = parsePositiveNumber(options.sync_interval_minutes || row?.sync_interval_minutes || process.env.ORDER_AUTO_SYNC_INTERVAL_MINUTES, 5, 5, 1440);
  const maxPages = parsePositiveNumber(options.max_pages || options.maxPages || process.env.ORDER_SYNC_MAX_PAGES || process.env.DARAZ_SYNC_MAX_PAGES, 5, 1, 100);

  const explicitFrom = parseDateInput(options.date_from || options.dateFrom || options.start_date || options.startDate || options.created_after || options.after);
  const explicitTo = parseDateInput(options.date_to || options.dateTo || options.end_date || options.endDate || options.created_before || options.before);
  const dateTo = explicitTo || new Date();
  const dateFrom = explicitFrom || new Date(dateTo.getTime() - days * 86400000);

  return { days, limit, interval, maxPages, dateFrom, dateTo, row };
}

function signDaraz(apiPath, params, secret) {
  const path = String(apiPath || '').startsWith('/') ? apiPath : `/${apiPath}`;
  const sorted = Object.keys(params).filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '').sort();
  let source = path;
  for (const key of sorted) source += `${key}${params[key]}`;
  return crypto.createHmac('sha256', String(secret || '')).update(source, 'utf8').digest('hex').toUpperCase();
}

function normalizeCredential(row = {}) {
  return {
    app_key: clean(row.app_key || row.app_key_encrypted || row.appKey || row.client_id || row.clientId || process.env.DARAZ_APP_KEY),
    app_secret: clean(row.app_secret || row.app_secret_encrypted || row.appSecret || row.client_secret || row.clientSecret || process.env.DARAZ_APP_SECRET),
    access_token: clean(row.access_token || row.access_token_encrypted || row.accessToken || row.token || process.env.DARAZ_ACCESS_TOKEN),
    refresh_token: clean(row.refresh_token || row.refresh_token_encrypted || row.refreshToken),
    consumer_key: clean(row.consumer_key || row.consumer_key_encrypted || row.consumerKey || row.woo_consumer_key || process.env.WOO_CONSUMER_KEY),
    consumer_secret: clean(row.consumer_secret || row.consumer_secret_encrypted || row.consumerSecret || row.woo_consumer_secret || process.env.WOO_CONSUMER_SECRET),
    store_url: clean(row.store_url || row.woocommerce_url || row.website_url || row.base_url || process.env.WOO_STORE_URL),
  };
}

async function getDarazCredentials(account) {
  const rows = await getCredentialRows(account.account_id, ['daraz_oauth', 'daraz', 'oauth']);
  const cred = normalizeCredential(rows[0] || {});
  cred.app_key = cred.app_key || process.env.DARAZ_APP_KEY || '';
  cred.app_secret = cred.app_secret || process.env.DARAZ_APP_SECRET || '';
  cred.access_token = cred.access_token || process.env.DARAZ_ACCESS_TOKEN || '';
  return cred;
}

function safeDarazRequestLog(query = {}) {
  const safe = { ...query };
  if (safe.access_token) safe.access_token = '***';
  if (safe.sign) safe.sign = '***';
  return safe;
}

async function callDaraz(account, credentials, apiPath, query = {}) {
  const baseUrl = clean(account.api_base_url || process.env.DARAZ_API_BASE_URL || 'https://api.daraz.lk/rest').replace(/\/+$/, '');
  if (!credentials.app_key || !credentials.app_secret || !credentials.access_token) {
    throw Object.assign(new Error(`Daraz credentials missing for ${account.account_name || account.account_code}`), { code: 'DARAZ_CREDENTIALS_MISSING' });
  }

  const params = {
    app_key: credentials.app_key,
    access_token: credentials.access_token,
    timestamp: Date.now(),
    sign_method: 'sha256',
    ...query,
  };
  params.sign = signDaraz(apiPath, params, credentials.app_secret);

  try {
    const response = await axios.get(`${baseUrl}${apiPath}`, { params, timeout: 60000 });
    const body = response.data;
    await writeDarazApiLog({
      account_id: account.account_id,
      account_code: account.account_code,
      account_name: account.account_name,
      api_path: apiPath,
      http_method: 'GET',
      status_code: response.status,
      success: !(body?.error_response || body?.ErrorResponse || (body?.code && String(body.code) !== '0')),
      request_payload: safeDarazRequestLog(params),
      response_payload: body,
    }).catch(() => null);

    if (body?.error_response || body?.ErrorResponse || (body?.code && String(body.code) !== '0')) {
      const errSource = body.error_response || body.ErrorResponse || body;
      throw new Error(errSource.message || errSource.msg || errSource.error_message || 'Daraz API error');
    }
    return body;
  } catch (error) {
    await writeDarazApiLog({
      account_id: account.account_id,
      account_code: account.account_code,
      account_name: account.account_name,
      api_path: apiPath,
      http_method: 'GET',
      success: false,
      request_payload: safeDarazRequestLog(params),
      response_payload: error.response?.data || null,
      status_code: error.response?.status || null,
      error_message: error.response?.data?.message || error.message,
    }).catch(() => null);
    throw error;
  }
}

function findArrayWithObjectKeys(input, keyNames = []) {
  const wanted = new Set(keyNames.map((k) => String(k).toLowerCase()));
  const queue = [input];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value) && value.some((item) => item && typeof item === 'object' && Object.keys(item).some((key) => wanted.has(String(key).toLowerCase())))) return value;
    if (!Array.isArray(value)) Object.values(value).forEach((child) => { if (child && typeof child === 'object') queue.push(child); });
    else value.forEach((child) => { if (child && typeof child === 'object') queue.push(child); });
  }
  return [];
}

function extractDarazOrders(body) {
  return findArrayWithObjectKeys(body, ['order_id', 'orderId', 'daraz_order_id'])
    || deepFindArray(body, ['orders', 'order_list', 'orderList', 'data', 'items']);
}

function extractDarazItems(body) {
  return findArrayWithObjectKeys(body, ['order_item_id', 'orderItemId', 'sku', 'seller_sku', 'shop_sku'])
    || deepFindArray(body, ['order_items', 'OrderItems', 'orderItems', 'order_item_list', 'items', 'data']);
}

function darazStatus(order, fallback = 'pending') {
  const value = pick(order, ['statuses', 'status', 'order_status'], fallback);
  if (Array.isArray(value)) return clean(value[0] || fallback);
  if (value && typeof value === 'object') return clean(value.status || value.name || fallback);
  return clean(value || fallback);
}

async function upsertDarazOrder(account, order, items = []) {
  const conn = await orderDb.getConnection();
  try {
    await conn.beginTransaction();
    const darazOrderId = clean(pick(order, ['order_id', 'orderId', 'daraz_order_id', 'id']));
    if (!darazOrderId) {
      await conn.rollback();
      return { skipped: true, reason: 'ORDER_ID_MISSING' };
    }

    const [[existingOrder]] = await conn.query(
      'SELECT id FROM daraz_orders WHERE account_id = ? AND daraz_order_id = ? LIMIT 1',
      [account.account_id, darazOrderId],
    );

    const grandTotal = toNumber(pick(order, ['price', 'total_price', 'grand_total', 'order_total', 'paid_price'], 0), 0);
    const ship = getAddressObject(order, 'address_shipping');
    const bill = getAddressObject(order, 'address_billing');
    const shipFirst = pick(ship, ['first_name', 'firstname'], '');
    const shipLast = pick(ship, ['last_name', 'lastname'], '');
    const shipName = clean(`${shipFirst || ''} ${shipLast || ''}`) || pick(order, ['shipping_name', 'buyer_name'], null);
    const shipPhone = pick(ship, ['phone', 'phone1', 'mobile'], pick(order, ['address_shipping_phone', 'buyer_phone', 'shipping_phone', 'phone'], ''));
    const shipPhone2 = pick(ship, ['phone2', 'phone_2'], null);
    const shipAddress = joinAddressParts(
      pick(ship, ['address1', 'address_1'], null),
      pick(ship, ['address2', 'address_2'], null),
      pick(ship, ['address3'], null),
      pick(ship, ['address4'], null),
      pick(ship, ['address5'], null),
    ) || cleanText(pick(order, ['shipping_address', 'address'], null));
    const shipCity = pick(ship, ['city'], pick(order, ['address_shipping_city', 'shipping_city', 'city'], null));
    const shipPostCode = pick(ship, ['post_code', 'postcode', 'postal_code'], pick(order, ['shipping_postal_code'], null));
    const shipCountry = pick(ship, ['country'], pick(order, ['address_shipping_country', 'shipping_country', 'country'], 'Sri Lanka'));
    const shipProvince = pick(ship, ['region', 'state', 'province'], pick(order, ['address_shipping_region', 'shipping_region', 'region', 'province'], null));
    const customerName = clean(`${pick(order, ['customer_first_name'], '')} ${pick(order, ['customer_last_name'], '')}`) || shipName || pick(order, ['buyer_name', 'name'], 'Daraz Customer');
    const customerId = await upsertCustomer(conn, {
      customer_name: customerName,
      phone: shipPhone || pick(bill, ['phone'], ''),
      phone_alt: shipPhone2,
      email: pick(order, ['buyer_email', 'email'], ''),
      shipping_full_name: shipName || customerName,
      shipping_phone: shipPhone,
      shipping_address_line1: shipAddress,
      shipping_city: shipCity,
      shipping_province: shipProvince,
      shipping_postal_code: shipPostCode,
      shipping_country: shipCountry,
      source_type: 'DARAZ',
      source_account_id: account.account_id,
      source_account_code: account.account_code,
      source_account_name: account.account_name,
      marketplace_customer_id: pick(order, ['customer_id', 'buyer_id'], null),
      order_total: grandTotal,
    });

    const [orderResult] = await conn.query(
      `INSERT INTO daraz_orders
        (account_id, account_code, account_name, customer_id, daraz_order_id, order_number, order_status, payment_method, payment_status,
         order_date, created_time, updated_time, promised_shipping_time, item_total, discount_total, shipping_fee, voucher_total, grand_total, currency,
         buyer_name, buyer_phone, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_region, raw_payload, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         customer_id = VALUES(customer_id), order_number = VALUES(order_number), order_status = VALUES(order_status), payment_method = VALUES(payment_method), payment_status = VALUES(payment_status),
         order_date = VALUES(order_date), updated_time = VALUES(updated_time), item_total = VALUES(item_total), discount_total = VALUES(discount_total), shipping_fee = VALUES(shipping_fee), voucher_total = VALUES(voucher_total), grand_total = VALUES(grand_total), currency = VALUES(currency),
         buyer_name = VALUES(buyer_name), buyer_phone = VALUES(buyer_phone), shipping_name = VALUES(shipping_name), shipping_phone = VALUES(shipping_phone), shipping_address = VALUES(shipping_address), shipping_city = VALUES(shipping_city), shipping_region = VALUES(shipping_region), raw_payload = VALUES(raw_payload), last_synced_at = NOW(), updated_at = NOW()`,
      [
        account.account_id,
        account.account_code,
        account.account_name,
        customerId,
        darazOrderId,
        pick(order, ['order_number', 'orderNumber', 'order_id'], darazOrderId),
        darazStatus(order, 'pending'),
        pick(order, ['payment_method', 'paymentMethod'], null),
        pick(order, ['payment_status'], null),
        isoMysql(pick(order, ['created_at', 'create_time', 'order_date', 'created_time'], null)),
        isoMysql(pick(order, ['created_at', 'create_time', 'created_time'], null)),
        isoMysql(pick(order, ['updated_at', 'update_time', 'updated_time'], null)),
        isoMysql(pick(order, ['promised_shipping_time', 'promised_ship_date'], null)),
        toNumber(pick(order, ['items_count', 'item_total', 'subtotal'], grandTotal), grandTotal),
        toNumber(pick(order, ['voucher', 'discount_total', 'discount_amount'], 0), 0),
        toNumber(pick(order, ['shipping_fee', 'shipping_amount'], 0), 0),
        toNumber(pick(order, ['voucher', 'voucher_total'], 0), 0),
        grandTotal,
        pick(order, ['currency'], 'LKR'),
        customerName,
        shipPhone || pick(order, ['buyer_phone', 'phone'], null),
        shipName || customerName,
        shipPhone || pick(order, ['buyer_phone', 'phone'], null),
        shipAddress,
        shipCity,
        shipProvince,
        safeJson(order),
      ],
    );

    let orderRowId = orderResult.insertId || existingOrder?.id;
    if (!orderRowId) {
      const [[row]] = await conn.query('SELECT id FROM daraz_orders WHERE account_id = ? AND daraz_order_id = ? LIMIT 1', [account.account_id, darazOrderId]);
      orderRowId = row?.id;
    }

    const insertedItems = [];
    let itemsSaved = 0;
    for (const item of items) {
      const itemSku = clean(pick(item, ['seller_sku', 'sku', 'shop_sku', 'marketplace_sku'], ''));
      const itemId = clean(pick(item, ['order_item_id', 'orderItemId', 'id'], `${darazOrderId}-${itemSku || Date.now()}`));
      const qty = Math.max(toInt(pick(item, ['quantity', 'qty'], 1), 1), 1);
      const unitPrice = toNumber(pick(item, ['item_price', 'unit_price', 'paid_price', 'price'], 0), 0);
      const lineTotal = toNumber(pick(item, ['paid_price', 'line_total', 'item_total'], unitPrice * qty), unitPrice * qty);
      const [itemResult] = await conn.query(
        `INSERT INTO daraz_order_items
          (daraz_order_id, daraz_order_item_id, marketplace_sku, local_sku, seller_sku, product_title, variation_name, product_image_url, qty, unit_price, discount_amount, paid_price, line_total, item_status, tracking_code, package_id, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          marketplace_sku = VALUES(marketplace_sku), local_sku = VALUES(local_sku), seller_sku = VALUES(seller_sku), product_title = VALUES(product_title), product_image_url = VALUES(product_image_url), qty = VALUES(qty), unit_price = VALUES(unit_price), discount_amount = VALUES(discount_amount), paid_price = VALUES(paid_price), line_total = VALUES(line_total), item_status = VALUES(item_status), tracking_code = VALUES(tracking_code), package_id = VALUES(package_id), raw_payload = VALUES(raw_payload), updated_at = NOW()`,
        [orderRowId, itemId, itemSku, item.local_sku || itemSku, itemSku, pick(item, ['name', 'product_name', 'item_name', 'product_title'], itemSku), pick(item, ['variation'], null), pick(item, ['product_main_image', 'product_image', 'image', 'image_url'], null), qty, unitPrice, toNumber(pick(item, ['voucher_amount', 'discount_amount'], 0), 0), lineTotal, lineTotal, pick(item, ['status', 'item_status'], darazStatus(order, 'pending')), pick(item, ['tracking_code', 'tracking_number'], null), pick(item, ['package_id'], null), safeJson(item)],
      );
      itemsSaved += 1;
      if (itemResult.insertId) insertedItems.push({ id: itemResult.insertId, sku: itemSku, local_sku: item.local_sku || itemSku, qty });
    }

    await conn.commit();

    for (const item of insertedItems) {
      const deduction = await deductStockForOrderItem({ source_type: 'DARAZ', source_order_id: orderRowId, source_item_id: item.id, platform: 'DARAZ', account_id: account.account_id, account_code: account.account_code, sku: item.sku, local_sku: item.local_sku, qty: item.qty });
      if (deduction.deducted) await orderDb.query('UPDATE daraz_order_items SET stock_deducted = 1, stock_deducted_at = NOW(), stock_movement_id = ? WHERE id = ?', [deduction.movement_id, item.id]);
    }

    const [[confirm]] = await orderDb.query(
      'SELECT COUNT(*) AS order_count FROM daraz_orders WHERE id = ?',
      [orderRowId],
    ).catch(() => [[{ order_count: 0 }]]);

    return {
      skipped: false,
      inserted: !existingOrder,
      updated: Boolean(existingOrder),
      order_id: orderRowId,
      external_order_id: darazOrderId,
      items: itemsSaved,
      confirmed: Number(confirm?.order_count || 0) > 0,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function writeSyncRun(platform, payload = {}) {
  const table = platform === 'DARAZ' ? 'daraz_order_sync_runs' : 'woo_order_sync_runs';
  try {
    const [result] = await orderDb.query(
      `INSERT INTO ${table}
        (account_id, account_code, account_name, sync_type, days, date_from, date_to, limit_rows, max_pages, status,
         fetched_orders, saved_orders, inserted_orders, updated_orders, skipped_orders, saved_items, confirmed_orders,
         error_message, request_payload, response_payload, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.account_id || null,
        payload.account_code || null,
        payload.account_name || null,
        payload.sync_type || 'manual',
        payload.days || null,
        payload.date_from || null,
        payload.date_to || null,
        payload.limit_rows || null,
        payload.max_pages || null,
        payload.status || 'running',
        payload.fetched_orders || 0,
        payload.saved_orders || 0,
        payload.inserted_orders || 0,
        payload.updated_orders || 0,
        payload.skipped_orders || 0,
        payload.saved_items || 0,
        payload.confirmed_orders || 0,
        payload.error_message || null,
        safeJson(payload.request_payload || null),
        safeJson(payload.response_payload || null),
        payload.started_at || new Date(),
        payload.finished_at || null,
      ],
    );
    return result.insertId;
  } catch (error) {
    console.warn(`[${platform}_SYNC_RUN_LOG_SKIPPED]`, error.message);
    return null;
  }
}

async function finishSyncRun(platform, runId, payload = {}) {
  if (!runId) return;
  const table = platform === 'DARAZ' ? 'daraz_order_sync_runs' : 'woo_order_sync_runs';
  try {
    await orderDb.query(
      `UPDATE ${table}
       SET status = ?, fetched_orders = ?, saved_orders = ?, inserted_orders = ?, updated_orders = ?, skipped_orders = ?,
           saved_items = ?, confirmed_orders = ?, error_message = ?, response_payload = ?, finished_at = NOW()
       WHERE id = ?`,
      [
        payload.status || 'success',
        payload.fetched_orders || 0,
        payload.saved_orders || 0,
        payload.inserted_orders || 0,
        payload.updated_orders || 0,
        payload.skipped_orders || 0,
        payload.saved_items || 0,
        payload.confirmed_orders || 0,
        payload.error_message || null,
        safeJson(payload.response_payload || null),
        runId,
      ],
    );
  } catch (error) {
    console.warn(`[${platform}_SYNC_RUN_UPDATE_SKIPPED]`, error.message);
  }
}

function makeAccountResult(account, cfg) {
  return {
    account_id: account.account_id,
    account_code: account.account_code,
    account_name: account.account_name,
    days: cfg.days,
    date_from: dateOnly(cfg.dateFrom),
    date_to: dateOnly(cfg.dateTo),
    limit: cfg.limit,
    max_pages: cfg.maxPages,
    fetched: 0,
    saved: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    confirmed_orders: 0,
    items_saved: 0,
    pages: 0,
    sync_run_id: null,
    errors: [],
  };
}

async function syncDarazOrders(options = {}) {
  await updateSyncSetting('DARAZ', 'running', null);
  const cfg = await getSyncConfig('DARAZ', options);
  const accounts = filterAccounts(await listMarketplaceAccounts({ platform: 'DARAZ', activeOnly: true }), options);
  const result = { platform: 'DARAZ', accounts: [], total_orders: 0, total_items: 0, inserted_orders: 0, updated_orders: 0, confirmed_orders: 0, errors: [], api_path: process.env.DARAZ_ORDERS_GET_PATH || '/orders/get', item_api_path: process.env.DARAZ_ORDER_ITEMS_GET_PATH || '/order/items/get' };

  if (!accounts.length) {
    result.errors.push({ message: 'No active Daraz accounts found for this sync request.' });
    await updateSyncSetting('DARAZ', 'failed', result.errors[0].message);
    return result;
  }

  for (const account of accounts) {
    const accountResult = makeAccountResult(account, cfg);
    const runId = await writeSyncRun('DARAZ', {
      ...accountResult,
      limit_rows: cfg.limit,
      status: 'running',
      request_payload: options,
      started_at: new Date(),
    });
    accountResult.sync_run_id = runId;

    try {
      const credentials = await getDarazCredentials(account);
      let offset = 0;
      let allOrders = [];
      for (let page = 1; page <= cfg.maxPages; page += 1) {
        const orderBody = await callDaraz(account, credentials, result.api_path, {
          created_after: darazDate(cfg.dateFrom),
          created_before: darazDate(cfg.dateTo),
          sort_direction: 'DESC',
          limit: cfg.limit,
          offset,
        });
        const pageOrders = extractDarazOrders(orderBody);
        accountResult.pages += 1;
        if (!pageOrders.length) break;
        allOrders = allOrders.concat(pageOrders);
        if (pageOrders.length < cfg.limit) break;
        offset += cfg.limit;
      }

      accountResult.fetched = allOrders.length;
      for (const order of allOrders) {
        const darazOrderId = clean(pick(order, ['order_id', 'orderId', 'daraz_order_id', 'id'], ''));
        let itemRows = extractDarazItems(order);
        if (!itemRows.length && darazOrderId) {
          try {
            const itemBody = await callDaraz(account, credentials, result.item_api_path, { order_id: darazOrderId });
            itemRows = extractDarazItems(itemBody);
          } catch (itemError) {
            accountResult.errors.push(`items ${darazOrderId}: ${itemError.message}`);
          }
        }

        const saved = await upsertDarazOrder(account, order, itemRows);
        if (saved.skipped) {
          accountResult.skipped += 1;
          continue;
        }

        accountResult.saved += 1;
        accountResult.items_saved += saved.items || 0;
        if (saved.inserted) accountResult.inserted += 1;
        if (saved.updated) accountResult.updated += 1;
        if (saved.confirmed) accountResult.confirmed_orders += 1;
        await writeOrderLog({
          source_type: 'DARAZ',
          source_order_id: saved.order_id,
          order_no: saved.external_order_id,
          event_type: saved.inserted ? 'ORDER_SYNC_CREATED' : 'ORDER_SYNC_UPDATED',
          message: `Daraz order ${saved.inserted ? 'created' : 'updated'} from sync: ${saved.external_order_id}`,
          meta: { account_id: account.account_id, account_code: account.account_code, items: saved.items, confirmed: saved.confirmed },
        }).catch(() => null);
      }

      result.total_orders += accountResult.saved;
      result.total_items += accountResult.items_saved;
      result.inserted_orders += accountResult.inserted;
      result.updated_orders += accountResult.updated;
      result.confirmed_orders += accountResult.confirmed_orders;
      await updateAccountOrderSync(account.account_id, true);
    } catch (error) {
      accountResult.errors.push(error.message);
      result.errors.push({ account_id: account.account_id, account_code: account.account_code, message: error.message });
      await updateAccountOrderSync(account.account_id, false, error.message);
    }

    const accountStatus = accountResult.errors.length && accountResult.saved ? 'partial' : (accountResult.errors.length ? 'failed' : 'success');
    await finishSyncRun('DARAZ', runId, {
      status: accountStatus,
      fetched_orders: accountResult.fetched,
      saved_orders: accountResult.saved,
      inserted_orders: accountResult.inserted,
      updated_orders: accountResult.updated,
      skipped_orders: accountResult.skipped,
      saved_items: accountResult.items_saved,
      confirmed_orders: accountResult.confirmed_orders,
      error_message: accountResult.errors[0] || null,
      response_payload: accountResult,
    });
    result.accounts.push(accountResult);
  }

  const finalStatus = result.errors.length && result.total_orders ? 'partial' : (result.errors.length ? 'failed' : 'success');
  await updateSyncSetting('DARAZ', finalStatus, result.errors[0]?.message || null);
  await writeSystemLog({ action: 'DARAZ_ORDER_SYNC', message: `Daraz sync ${finalStatus}: ${result.total_orders} orders`, meta: result }).catch(() => null);
  return result;
}

function cleanStoreUrl(url) {
  const u = clean(url || process.env.WOO_STORE_URL);
  if (!u) throw new Error('Woo store URL missing.');
  return (u.startsWith('http') ? u : `https://${u}`).replace(/\/+$/, '');
}

async function getWooCredentials(account) {
  const rows = await getCredentialRows(account.account_id, ['woocommerce_keys', 'woo', 'woocommerce']);
  const cred = normalizeCredential(rows[0] || {});
  cred.store_url = cred.store_url || account.store_url || account.api_base_url || process.env.WOO_STORE_URL || '';
  return cred;
}

async function fetchWooOrders(account, credentials, options = {}) {
  if (!credentials.consumer_key || !credentials.consumer_secret) throw new Error(`Woo credentials missing for ${account.account_name || account.account_code}`);
  const baseURL = `${cleanStoreUrl(credentials.store_url)}/wp-json/wc/v3`;
  const orders = [];
  for (let page = 1; page <= Number(options.maxPages || 5); page += 1) {
    const response = await axios.get(`${baseURL}/orders`, {
      auth: { username: credentials.consumer_key, password: credentials.consumer_secret },
      params: {
        page,
        per_page: options.limit || 50,
        orderby: 'date',
        order: 'desc',
        after: options.dateFrom?.toISOString ? options.dateFrom.toISOString() : new Date(Date.now() - Number(options.days || 7) * 86400000).toISOString(),
        before: options.dateTo?.toISOString ? options.dateTo.toISOString() : undefined,
      },
      timeout: 60000,
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    orders.push(...rows);
    if (rows.length < Number(options.limit || 50)) break;
  }
  return orders;
}

async function upsertWooOrder(account, order) {
  const conn = await orderDb.getConnection();
  try {
    await conn.beginTransaction();
    const wooOrderId = clean(pick(order, ['id', 'woo_order_id'], ''));
    if (!wooOrderId) {
      await conn.rollback();
      return { skipped: true, reason: 'ORDER_ID_MISSING' };
    }

    const [[existingOrder]] = await conn.query(
      'SELECT id FROM woo_orders WHERE account_id = ? AND woo_order_id = ? LIMIT 1',
      [account.account_id, wooOrderId],
    );

    const billing = order.billing || {};
    const shipping = order.shipping || {};
    const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
    const name = clean(`${billing.first_name || shipping.first_name || ''} ${billing.last_name || shipping.last_name || ''}`) || order.customer_name || 'Woo Customer';
    const grandTotal = toNumber(order.total, 0);
    const customerId = await upsertCustomer(conn, {
      customer_name: name,
      phone: billing.phone || shipping.phone || order.customer_phone,
      email: billing.email || order.customer_email,
      shipping_full_name: clean(`${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`) || name,
      shipping_phone: shipping.phone || billing.phone,
      shipping_address_line1: [shipping.address_1, shipping.address_2].filter(Boolean).join(', ') || [billing.address_1, billing.address_2].filter(Boolean).join(', '),
      shipping_city: shipping.city || billing.city,
      shipping_province: shipping.state || billing.state,
      shipping_postal_code: shipping.postcode || billing.postcode,
      shipping_country: shipping.country || billing.country || 'Sri Lanka',
      source_type: 'WOO',
      source_account_id: account.account_id,
      source_account_code: account.account_code,
      source_account_name: account.account_name,
      marketplace_customer_id: order.customer_id || null,
      order_total: grandTotal,
    });

    const [orderResult] = await conn.query(
      `INSERT INTO woo_orders
        (account_id, account_code, account_name, customer_id, woo_order_id, order_number, order_status, payment_method, payment_status, order_date, created_time, updated_time, item_total, discount_total, shipping_fee, tax_total, grand_total, currency, buyer_name, buyer_phone, buyer_email, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_region, raw_payload, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
        customer_id = VALUES(customer_id), order_number = VALUES(order_number), order_status = VALUES(order_status), payment_method = VALUES(payment_method), payment_status = VALUES(payment_status), order_date = VALUES(order_date), updated_time = VALUES(updated_time), item_total = VALUES(item_total), discount_total = VALUES(discount_total), shipping_fee = VALUES(shipping_fee), tax_total = VALUES(tax_total), grand_total = VALUES(grand_total), currency = VALUES(currency), buyer_name = VALUES(buyer_name), buyer_phone = VALUES(buyer_phone), buyer_email = VALUES(buyer_email), shipping_name = VALUES(shipping_name), shipping_phone = VALUES(shipping_phone), shipping_address = VALUES(shipping_address), shipping_city = VALUES(shipping_city), shipping_region = VALUES(shipping_region), raw_payload = VALUES(raw_payload), last_synced_at = NOW(), updated_at = NOW()`,
      [account.account_id, account.account_code, account.account_name, customerId, wooOrderId, order.number || wooOrderId, order.status || 'pending', order.payment_method_title || order.payment_method || null, ['processing', 'completed'].includes(order.status) ? 'Paid' : 'Pending', isoMysql(order.date_created || order.created_at), isoMysql(order.date_created || order.created_at), isoMysql(order.date_modified || order.updated_at), toNumber(order.total, 0), toNumber(order.discount_total, 0), toNumber(order.shipping_total, 0), toNumber(order.total_tax, 0), grandTotal, order.currency || 'LKR', name, billing.phone || shipping.phone || null, billing.email || null, clean(`${shipping.first_name || ''} ${shipping.last_name || ''}`) || name, shipping.phone || billing.phone || null, [shipping.address_1, shipping.address_2].filter(Boolean).join(', '), shipping.city || billing.city || null, shipping.state || billing.state || null, safeJson(order)],
    );

    let orderRowId = orderResult.insertId || existingOrder?.id;
    if (!orderRowId) {
      const [[row]] = await conn.query('SELECT id FROM woo_orders WHERE account_id = ? AND woo_order_id = ? LIMIT 1', [account.account_id, wooOrderId]);
      orderRowId = row?.id;
    }

    const insertedItems = [];
    let itemsSaved = 0;
    for (const item of lineItems) {
      const sku = clean(item.sku || item.name || '');
      const qty = Math.max(toInt(item.quantity, 1), 1);
      const lineTotal = toNumber(item.total, 0);
      const [itemResult] = await conn.query(
        `INSERT INTO woo_order_items
          (woo_order_id, woo_line_item_id, marketplace_sku, local_sku, sku, product_title, variation_name, product_image_url, qty, unit_price, discount_amount, line_total, item_status, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          marketplace_sku = VALUES(marketplace_sku), local_sku = VALUES(local_sku), sku = VALUES(sku), product_title = VALUES(product_title), variation_name = VALUES(variation_name), product_image_url = VALUES(product_image_url), qty = VALUES(qty), unit_price = VALUES(unit_price), discount_amount = VALUES(discount_amount), line_total = VALUES(line_total), item_status = VALUES(item_status), raw_payload = VALUES(raw_payload), updated_at = NOW()`,
        [orderRowId, item.id || null, sku, sku, sku, item.name || sku, item.variation_name || null, item.image?.src || item.image_url || null, qty, qty ? lineTotal / qty : lineTotal, 0, lineTotal, order.status || 'pending', safeJson(item)],
      );
      itemsSaved += 1;
      if (itemResult.insertId) insertedItems.push({ id: itemResult.insertId, sku, local_sku: sku, qty });
    }

    await conn.commit();

    for (const item of insertedItems) {
      const deduction = await deductStockForOrderItem({ source_type: 'WOO', source_order_id: orderRowId, source_item_id: item.id, platform: 'WOO', account_id: account.account_id, account_code: account.account_code, sku: item.sku, local_sku: item.local_sku, qty: item.qty });
      if (deduction.deducted) await orderDb.query('UPDATE woo_order_items SET stock_deducted = 1, stock_deducted_at = NOW(), stock_movement_id = ? WHERE id = ?', [deduction.movement_id, item.id]);
    }

    const [[confirm]] = await orderDb.query(
      'SELECT COUNT(*) AS order_count FROM woo_orders WHERE id = ?',
      [orderRowId],
    ).catch(() => [[{ order_count: 0 }]]);

    return {
      skipped: false,
      inserted: !existingOrder,
      updated: Boolean(existingOrder),
      order_id: orderRowId,
      external_order_id: wooOrderId,
      items: itemsSaved,
      confirmed: Number(confirm?.order_count || 0) > 0,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function syncWooOrders(options = {}) {
  await updateSyncSetting('WOO', 'running', null);
  const cfg = await getSyncConfig('WOO', options);
  const accounts = filterAccounts(await listMarketplaceAccounts({ platform: 'WOO', activeOnly: true }), options);
  const result = { platform: 'WOO', accounts: [], total_orders: 0, total_items: 0, inserted_orders: 0, updated_orders: 0, confirmed_orders: 0, errors: [] };

  if (!accounts.length) {
    result.errors.push({ message: 'No active WooCommerce accounts found for this sync request.' });
    await updateSyncSetting('WOO', 'failed', result.errors[0].message);
    return result;
  }

  for (const account of accounts) {
    const accountResult = makeAccountResult(account, cfg);
    const runId = await writeSyncRun('WOO', {
      ...accountResult,
      limit_rows: cfg.limit,
      status: 'running',
      request_payload: options,
      started_at: new Date(),
    });
    accountResult.sync_run_id = runId;

    try {
      const credentials = await getWooCredentials(account);
      const orders = await fetchWooOrders(account, credentials, { days: cfg.days, limit: cfg.limit, maxPages: cfg.maxPages, dateFrom: cfg.dateFrom, dateTo: cfg.dateTo });
      accountResult.fetched = orders.length;
      accountResult.pages = Math.ceil(orders.length / cfg.limit) || 0;

      for (const order of orders) {
        const saved = await upsertWooOrder(account, order);
        if (saved.skipped) {
          accountResult.skipped += 1;
          continue;
        }

        accountResult.saved += 1;
        accountResult.items_saved += saved.items || 0;
        if (saved.inserted) accountResult.inserted += 1;
        if (saved.updated) accountResult.updated += 1;
        if (saved.confirmed) accountResult.confirmed_orders += 1;
        await writeOrderLog({
          source_type: 'WOO',
          source_order_id: saved.order_id,
          order_no: saved.external_order_id,
          event_type: saved.inserted ? 'ORDER_SYNC_CREATED' : 'ORDER_SYNC_UPDATED',
          message: `Woo order ${saved.inserted ? 'created' : 'updated'} from sync: ${saved.external_order_id}`,
          meta: { account_id: account.account_id, account_code: account.account_code, items: saved.items, confirmed: saved.confirmed },
        }).catch(() => null);
      }

      result.total_orders += accountResult.saved;
      result.total_items += accountResult.items_saved;
      result.inserted_orders += accountResult.inserted;
      result.updated_orders += accountResult.updated;
      result.confirmed_orders += accountResult.confirmed_orders;
      await updateAccountOrderSync(account.account_id, true);
    } catch (error) {
      accountResult.errors.push(error.message);
      result.errors.push({ account_id: account.account_id, account_code: account.account_code, message: error.message });
      await updateAccountOrderSync(account.account_id, false, error.message);
    }

    const accountStatus = accountResult.errors.length && accountResult.saved ? 'partial' : (accountResult.errors.length ? 'failed' : 'success');
    await finishSyncRun('WOO', runId, {
      status: accountStatus,
      fetched_orders: accountResult.fetched,
      saved_orders: accountResult.saved,
      inserted_orders: accountResult.inserted,
      updated_orders: accountResult.updated,
      skipped_orders: accountResult.skipped,
      saved_items: accountResult.items_saved,
      confirmed_orders: accountResult.confirmed_orders,
      error_message: accountResult.errors[0] || null,
      response_payload: accountResult,
    });
    result.accounts.push(accountResult);
  }

  const finalStatus = result.errors.length && result.total_orders ? 'partial' : (result.errors.length ? 'failed' : 'success');
  await updateSyncSetting('WOO', finalStatus, result.errors[0]?.message || null);
  await writeSystemLog({ action: 'WOO_ORDER_SYNC', message: `Woo sync ${finalStatus}: ${result.total_orders} orders`, meta: result }).catch(() => null);
  return result;
}

async function updateSyncSetting(platformCode, status, errorMessage = null) {
  const [[existing]] = await orderDb.query('SELECT sync_interval_minutes, fetch_order_days FROM order_sync_settings WHERE platform_code = ? LIMIT 1', [platformCode]).catch(() => [[null]]);
  const interval = Math.max(Number(existing?.sync_interval_minutes || process.env.ORDER_AUTO_SYNC_INTERVAL_MINUTES || 5), 5);
  const days = Math.max(Number(existing?.fetch_order_days || process.env.ORDER_SYNC_DAYS_BACK || 7), 1);
  await orderDb.query(
    `INSERT INTO order_sync_settings (platform_code, sync_enabled, auto_sync_enabled, sync_interval_minutes, fetch_order_days, last_sync_status, last_sync_at, last_sync_started_at, last_sync_finished_at, last_sync_message, last_error_message, next_sync_at)
     VALUES (?, 1, 1, ?, ?, ?, NOW(), NOW(), IF(? = 'running', NULL, NOW()), ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
     ON DUPLICATE KEY UPDATE
       last_sync_status = VALUES(last_sync_status),
       last_sync_at = IF(VALUES(last_sync_status) = 'running', last_sync_at, NOW()),
       last_sync_started_at = IF(VALUES(last_sync_status) = 'running', NOW(), last_sync_started_at),
       last_sync_finished_at = IF(VALUES(last_sync_status) = 'running', last_sync_finished_at, NOW()),
       last_sync_message = VALUES(last_sync_message),
       last_error_message = VALUES(last_error_message),
       next_sync_at = DATE_ADD(NOW(), INTERVAL sync_interval_minutes MINUTE),
       updated_at = NOW()`,
    [platformCode, interval, days, status, status, status === 'running' ? 'Sync running' : `Sync ${status}`, errorMessage, interval],
  ).catch(() => null);
}

async function syncAllOrders(options = {}) {
  const [daraz, woo] = await Promise.allSettled([
    syncDarazOrders(options),
    syncWooOrders(options),
  ]);
  return {
    daraz: daraz.status === 'fulfilled' ? daraz.value : { errors: [{ message: daraz.reason?.message || 'Daraz sync failed' }] },
    woo: woo.status === 'fulfilled' ? woo.value : { errors: [{ message: woo.reason?.message || 'Woo sync failed' }] },
  };
}

module.exports = {
  syncDarazOrders,
  syncWooOrders,
  syncAllOrders,
};
