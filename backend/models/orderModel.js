const { orderDb } = require('../config/db');
const baseModel = require('./baseModel');

function findManualOrderById(id) {
  return baseModel.findById(orderDb, 'orders', id);
}

async function findLastManualOrderNo(prefix) {
  const [rows] = await orderDb.query(
    'SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`],
  );
  return rows[0]?.order_no || null;
}

async function createManualOrder(connection, payload) {
  const [result] = await connection.query(
    `INSERT INTO orders
      (order_no, customer_id, source_type, source_label, account_id, account_code, account_name, customer_order_ref,
       order_status, payment_status, payment_method, order_date, item_total, discount_total, shipping_fee, cod_fee, tax_total, grand_total,
       currency, customer_note, internal_note, raw_payload, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.order_no,
      payload.customer_id,
      payload.source_type,
      payload.source_label,
      payload.account_id || null,
      payload.account_code || null,
      payload.account_name || null,
      payload.customer_order_ref || null,
      payload.order_status || 'Pending',
      payload.payment_status || 'Unpaid',
      payload.payment_method || null,
      payload.order_date ? new Date(payload.order_date) : new Date(),
      payload.item_total,
      payload.discount_total,
      payload.shipping_fee,
      payload.cod_fee,
      payload.tax_total,
      payload.grand_total,
      payload.currency || 'LKR',
      payload.customer_note || null,
      payload.internal_note || null,
      payload.raw_payload || null,
      payload.created_by || null,
    ],
  );
  return result.insertId;
}

async function updateManualOrderStatus(id, payload) {
  const [result] = await orderDb.query(
    'UPDATE orders SET order_status = ?, shipped_at = IF(?, NOW(), shipped_at), updated_by = ?, updated_at = NOW() WHERE id = ?',
    [payload.status, payload.mark_shipped ? 1 : 0, payload.updated_by || null, id],
  );
  return result.affectedRows || 0;
}

module.exports = {
  findManualOrderById,
  findLastManualOrderNo,
  createManualOrder,
  updateManualOrderStatus,
};
