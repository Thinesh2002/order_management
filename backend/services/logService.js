const { logDb, orderDb } = require('../config/db');
const { safeInsert, safeJson } = require('../utils/dbUtils');

async function writeSystemLog(payload = {}) {
  const data = {
    module: payload.module || 'ORDER_MANAGEMENT',
    action: payload.action || payload.event_type || 'INFO',
    log_level: payload.log_level || payload.level || 'INFO',
    level: payload.log_level || payload.level || 'INFO',
    message: payload.message || null,
    description: payload.description || payload.message || null,
    reference_type: payload.reference_type || payload.entity_type || null,
    reference_id: payload.reference_id || payload.entity_id || null,
    request_payload: safeJson(payload.request_payload),
    response_payload: safeJson(payload.response_payload),
    meta: safeJson(payload.meta || payload),
    created_by: payload.created_by || null,
    created_at: new Date(),
  };

  try {
    return await safeInsert(logDb, 'system_logs', data);
  } catch (error) {
    console.warn('[SYSTEM_LOG_SKIPPED]', error.message);
    return null;
  }
}

async function writeOrderLog(payload = {}) {
  const data = {
    source_type: payload.source_type || null,
    source_order_id: payload.source_order_id || null,
    order_id: payload.order_id || payload.source_order_id || null,
    order_no: payload.order_no || null,
    event_type: payload.event_type || payload.action || 'ORDER_EVENT',
    action: payload.action || payload.event_type || 'ORDER_EVENT',
    old_value: payload.old_value || null,
    new_value: payload.new_value || null,
    message: payload.message || null,
    note: payload.note || payload.message || null,
    raw_payload: safeJson(payload.raw_payload || payload.meta || payload),
    meta: safeJson(payload.meta || payload),
    created_by: payload.created_by || null,
    created_at: new Date(),
  };

  try {
    const inserted = await safeInsert(logDb, 'order_logs', data);
    if (inserted) return inserted;
  } catch (error) {
    console.warn('[ORDER_LOG_LOGDB_SKIPPED]', error.message);
  }

  try {
    return await safeInsert(orderDb, 'order_logs', data);
  } catch (error) {
    console.warn('[ORDER_LOG_SKIPPED]', error.message);
    return null;
  }
}

async function writeInventoryDeductionLog(payload = {}) {
  const data = {
    source_type: payload.source_type || null,
    source_order_id: payload.source_order_id || null,
    source_item_id: payload.source_item_id || null,
    sku: payload.sku || null,
    local_sku: payload.local_sku || null,
    qty: payload.qty || null,
    status: payload.status || null,
    message: payload.message || null,
    movement_id: payload.movement_id || null,
    meta: safeJson(payload.meta || payload),
    created_at: new Date(),
  };

  try {
    return await safeInsert(logDb, 'inventory_stock_deduction_logs', data);
  } catch (error) {
    console.warn('[INVENTORY_DEDUCTION_LOG_SKIPPED]', error.message);
    return null;
  }
}

async function writeTransExpressLog(payload = {}) {
  const data = {
    action: payload.action || 'TRANS_EXPRESS_API',
    endpoint: payload.endpoint || null,
    status_code: payload.status_code || null,
    request_payload: safeJson(payload.request_payload),
    response_payload: safeJson(payload.response_payload),
    error_message: payload.error_message || null,
    created_at: new Date(),
  };

  try {
    return await safeInsert(logDb, 'trans_express_api_logs', data);
  } catch (error) {
    console.warn('[TRANS_EXPRESS_LOG_SKIPPED]', error.message);
    return null;
  }
}

async function writeDarazApiLog(payload = {}) {
  const data = {
    module: 'ORDER_MANAGEMENT',
    account_id: payload.account_id || null,
    account_code: payload.account_code || null,
    account_name: payload.account_name || null,
    api_path: payload.api_path || payload.endpoint || null,
    endpoint: payload.endpoint || payload.api_path || null,
    http_method: payload.http_method || payload.method || null,
    status_code: payload.status_code || null,
    success: payload.success === undefined ? null : (payload.success ? 1 : 0),
    request_payload: safeJson(payload.request_payload),
    response_payload: safeJson(payload.response_payload),
    error_message: payload.error_message || null,
    message: payload.message || payload.error_message || null,
    created_at: new Date(),
  };

  try {
    return await safeInsert(logDb, 'daraz_api_logs', data);
  } catch (error) {
    console.warn('[DARAZ_API_LOG_SKIPPED]', error.message);
    return null;
  }
}

async function listLogs({ limit = 100, type = 'all' } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const result = { system_logs: [], order_logs: [], sync_logs: [], trans_express_logs: [], inventory_logs: [] };

  async function queryIfExists(db, table, sql) {
    try {
      const [exists] = await db.query('SHOW TABLES LIKE ?', [table]);
      if (!exists.length) return [];
      const [rows] = await db.query(sql.replace('__LIMIT__', String(safeLimit)));
      return rows;
    } catch (_error) {
      return [];
    }
  }

  if (type === 'all' || type === 'system') {
    result.system_logs = await queryIfExists(logDb, 'system_logs', 'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT __LIMIT__');
  }
  if (type === 'all' || type === 'order') {
    result.order_logs = [
      ...(await queryIfExists(orderDb, 'order_logs', 'SELECT * FROM order_logs ORDER BY created_at DESC LIMIT __LIMIT__')),
      ...(await queryIfExists(logDb, 'order_logs', 'SELECT * FROM order_logs ORDER BY created_at DESC LIMIT __LIMIT__')),
    ].slice(0, safeLimit);
  }
  if (type === 'all' || type === 'sync') {
    result.sync_logs = [
      ...(await queryIfExists(orderDb, 'daraz_order_sync_runs', 'SELECT * FROM daraz_order_sync_runs ORDER BY created_at DESC LIMIT __LIMIT__')),
      ...(await queryIfExists(orderDb, 'woo_order_sync_runs', 'SELECT * FROM woo_order_sync_runs ORDER BY created_at DESC LIMIT __LIMIT__')),
      ...(await queryIfExists(logDb, 'daraz_order_sync_runs', 'SELECT * FROM daraz_order_sync_runs ORDER BY created_at DESC LIMIT __LIMIT__')),
      ...(await queryIfExists(logDb, 'woo_order_sync_runs', 'SELECT * FROM woo_order_sync_runs ORDER BY created_at DESC LIMIT __LIMIT__')),
    ].sort((a, b) => new Date(b.created_at || b.started_at || 0) - new Date(a.created_at || a.started_at || 0)).slice(0, safeLimit);
  }
  if (type === 'all' || type === 'daraz') {
    result.daraz_api_logs = await queryIfExists(logDb, 'daraz_api_logs', 'SELECT * FROM daraz_api_logs ORDER BY created_at DESC LIMIT __LIMIT__');
  }
  if (type === 'all' || type === 'trans_express') {
    result.trans_express_logs = await queryIfExists(logDb, 'trans_express_api_logs', 'SELECT * FROM trans_express_api_logs ORDER BY created_at DESC LIMIT __LIMIT__');
  }
  if (type === 'all' || type === 'inventory') {
    result.inventory_logs = [
      ...(await queryIfExists(orderDb, 'inventory_stock_deduction_logs', 'SELECT * FROM inventory_stock_deduction_logs ORDER BY created_at DESC LIMIT __LIMIT__')),
      ...(await queryIfExists(logDb, 'inventory_stock_deduction_logs', 'SELECT * FROM inventory_stock_deduction_logs ORDER BY created_at DESC LIMIT __LIMIT__')),
    ].slice(0, safeLimit);
  }

  return result;
}

module.exports = {
  writeSystemLog,
  writeOrderLog,
  writeInventoryDeductionLog,
  writeTransExpressLog,
  writeDarazApiLog,
  listLogs,
};
