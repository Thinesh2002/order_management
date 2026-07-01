const { orderDb } = require('../config/db');
const baseModel = require('./baseModel');

function findOrderItemById(id) {
  return baseModel.findById(orderDb, 'order_items', id);
}

async function listByManualOrderId(orderId) {
  const [rows] = await orderDb.query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [orderId]);
  return rows;
}

async function createManualOrderItem(connection, payload) {
  const [result] = await connection.query(
    `INSERT INTO order_items
      (order_id, product_id, variant_id, local_sku, sku, product_title, variation_name, product_image_url,
       qty, unit_price, discount_amount, line_total, item_status, raw_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.order_id,
      payload.product_id || null,
      payload.variant_id || null,
      payload.local_sku || payload.sku,
      payload.sku,
      payload.product_title || payload.title || payload.sku,
      payload.variation_name || null,
      payload.product_image_url || payload.image_url || null,
      payload.qty,
      payload.unit_price,
      payload.discount_amount || 0,
      payload.line_total,
      payload.item_status || 'Pending',
      payload.raw_payload || null,
    ],
  );
  return result.insertId;
}

async function markStockDeducted(itemId, stockMovementId) {
  await orderDb.query(
    'UPDATE order_items SET stock_deducted = 1, stock_deducted_at = NOW(), stock_movement_id = ? WHERE id = ?',
    [stockMovementId, itemId],
  );
}

module.exports = {
  findOrderItemById,
  listByManualOrderId,
  createManualOrderItem,
  markStockDeducted,
};
