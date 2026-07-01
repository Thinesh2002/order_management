const { inventoryDb } = require('../config/db');
const { qid, tableExists, getColumns } = require('../utils/dbUtils');

const STOCK_TABLE = process.env.INVENTORY_STOCK_TABLE || 'product_inventory';
const MOVEMENT_TABLE = process.env.INVENTORY_MOVEMENT_TABLE || 'inventory_stock_movements';

async function findStockBySku(sku) {
  const exists = await tableExists(inventoryDb, STOCK_TABLE).catch(() => false);
  if (!exists) return null;
  const columns = await getColumns(inventoryDb, STOCK_TABLE);
  const skuColumn = ['sku', 'local_sku', 'product_sku'].find((col) => columns.includes(col));
  if (!skuColumn) return null;
  const [rows] = await inventoryDb.query(`SELECT * FROM ${qid(STOCK_TABLE)} WHERE ${qid(skuColumn)} = ? LIMIT 1`, [sku]);
  return rows[0] || null;
}

async function createMovement(connection, payload) {
  const [result] = await connection.query(
    `INSERT INTO ${qid(MOVEMENT_TABLE)}
      (sku, local_sku, movement_type, qty, reference_type, reference_id, reference_item_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.sku || payload.local_sku,
      payload.local_sku || payload.sku,
      payload.movement_type || 'OUT',
      payload.qty,
      payload.reference_type || null,
      payload.reference_id || null,
      payload.reference_item_id || null,
      payload.note || null,
      payload.created_by || null,
    ],
  );
  return result.insertId;
}

module.exports = {
  STOCK_TABLE,
  MOVEMENT_TABLE,
  findStockBySku,
  createMovement,
};
