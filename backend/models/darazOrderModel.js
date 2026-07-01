const { orderDb } = require('../config/db');
const baseModel = require('./baseModel');

function findDarazOrderById(id) {
  return baseModel.findById(orderDb, 'daraz_orders', id);
}

async function findDarazOrderByExternalId(darazOrderId, accountId = null) {
  const values = [darazOrderId];
  let accountWhere = '';
  if (accountId) { accountWhere = ' AND account_id = ?'; values.push(accountId); }
  const [rows] = await orderDb.query(
    `SELECT * FROM daraz_orders WHERE daraz_order_id = ?${accountWhere} LIMIT 1`,
    values,
  );
  return rows[0] || null;
}

async function listDarazItems(darazOrderId) {
  const [rows] = await orderDb.query(
    'SELECT * FROM daraz_order_items WHERE daraz_order_id = ? ORDER BY id ASC',
    [darazOrderId],
  );
  return rows;
}

async function markDarazItemStockDeducted(itemId, stockMovementId) {
  await orderDb.query(
    'UPDATE daraz_order_items SET stock_deducted = 1, stock_deducted_at = NOW(), stock_movement_id = ? WHERE id = ?',
    [stockMovementId, itemId],
  );
}

module.exports = {
  findDarazOrderById,
  findDarazOrderByExternalId,
  listDarazItems,
  markDarazItemStockDeducted,
};
