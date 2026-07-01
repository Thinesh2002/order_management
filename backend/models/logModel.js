const { orderDb } = require('../config/db');
const { safeJson } = require('../utils/dbUtils');

async function createOrderLog(payload = {}) {
  await orderDb.query(
    `INSERT INTO order_logs
      (source_type, source_order_id, order_no, event_type, old_value, new_value, message, raw_payload, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.source_type || null,
      payload.source_order_id || null,
      payload.order_no || null,
      payload.event_type || payload.action || 'INFO',
      payload.old_value || null,
      payload.new_value || null,
      payload.message || null,
      safeJson(payload.raw_payload || payload.meta || null),
      payload.created_by || null,
    ],
  ).catch(() => null);
}

async function listOrderLogs({ limit = 200 } = {}) {
  const [rows] = await orderDb.query(
    'SELECT * FROM order_logs ORDER BY created_at DESC, id DESC LIMIT ?',
    [Number(limit) || 200],
  );
  return rows;
}

module.exports = {
  createOrderLog,
  listOrderLogs,
};
