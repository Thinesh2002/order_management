const { orderDb } = require('../config/db');
const baseModel = require('./baseModel');

function findWooOrderById(id) {
  return baseModel.findById(orderDb, 'woo_orders', id);
}

async function findWooOrderByExternalId(wooOrderId, accountId = null) {
  const values = [wooOrderId];
  let accountWhere = '';
  if (accountId) { accountWhere = ' AND account_id = ?'; values.push(accountId); }
  const [rows] = await orderDb.query(
    `SELECT * FROM woo_orders WHERE woo_order_id = ?${accountWhere} LIMIT 1`,
    values,
  );
  return rows[0] || null;
}

async function listWooItems(wooOrderId) {
  const [rows] = await orderDb.query(
    'SELECT * FROM woo_order_items WHERE woo_order_id = ? ORDER BY id ASC',
    [wooOrderId],
  );
  return rows;
}

async function markWooItemStockDeducted(itemId, stockMovementId) {
  await orderDb.query(
    'UPDATE woo_order_items SET stock_deducted = 1, stock_deducted_at = NOW(), stock_movement_id = ? WHERE id = ?',
    [stockMovementId, itemId],
  );
}

module.exports = {
  findWooOrderById,
  findWooOrderByExternalId,
  listWooItems,
  markWooItemStockDeducted,
};
