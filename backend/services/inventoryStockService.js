const { inventoryDb } = require('../config/db');
const { qid, tableExists, getColumns, safeInsert, toInt, clean } = require('../utils/dbUtils');
const { resolveLocalSku } = require('./skuMappingService');
const { writeInventoryDeductionLog } = require('./logService');

const STOCK_TABLE = process.env.INVENTORY_STOCK_TABLE || 'product_inventory';
const MOVEMENT_TABLE = process.env.INVENTORY_MOVEMENT_TABLE || 'inventory_stock_movements';
const ALLOW_NEGATIVE = String(process.env.INVENTORY_ALLOW_NEGATIVE_STOCK || 'false').toLowerCase() === 'true';

async function insertMovement(connection, payload) {
  const exists = await tableExists(connection, MOVEMENT_TABLE).catch(() => false);
  if (!exists) return null;

  const columns = await getColumns(connection, MOVEMENT_TABLE);
  const colSet = new Set(columns);
  const data = {
    sku: payload.sku,
    movement_type: payload.movement_type || 'OUT',
    reference_type: payload.reference_type || 'ORDER',
    reference_id: payload.reference_id || null,
    qty_before: payload.qty_before,
    qty_change: payload.qty_change,
    qty_after: payload.qty_after,
    cost_price: payload.cost_price || 0,
    note: payload.note || null,
    created_by: payload.created_by || null,
    created_at: new Date(),
  };

  const keys = Object.keys(data).filter((key) => colSet.has(key));
  if (!keys.length) return null;

  const [result] = await connection.query(
    `INSERT INTO ${qid(MOVEMENT_TABLE)} (${keys.map(qid).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((key) => data[key]),
  );
  return result.insertId;
}

async function deductStockForOrderItem({
  source_type,
  source_order_id,
  source_item_id,
  platform,
  account_id,
  account_code,
  sku,
  local_sku,
  qty,
  created_by,
}) {
  const orderQty = Math.max(toInt(qty, 1), 1);
  const resolvedSku = clean(local_sku) || await resolveLocalSku({
    platform,
    account_id,
    account_code,
    marketplace_sku: sku,
    fallback_sku: sku,
  });

  if (!resolvedSku) {
    const response = { deducted: false, reason: 'SKU_EMPTY', local_sku: null, movement_id: null };
    await writeInventoryDeductionLog({ source_type, source_order_id, source_item_id, sku, qty: orderQty, status: 'FAILED', message: 'SKU is empty', meta: response });
    return response;
  }

  const exists = await tableExists(inventoryDb, STOCK_TABLE).catch(() => false);
  if (!exists) {
    const response = { deducted: false, reason: 'INVENTORY_TABLE_NOT_FOUND', local_sku: resolvedSku, movement_id: null };
    await writeInventoryDeductionLog({ source_type, source_order_id, source_item_id, sku, local_sku: resolvedSku, qty: orderQty, status: 'FAILED', message: `${STOCK_TABLE} table not found`, meta: response });
    return response;
  }

  const connection = await inventoryDb.getConnection();
  try {
    await connection.beginTransaction();

    const columns = await getColumns(connection, STOCK_TABLE);
    const colSet = new Set(columns);
    if (!colSet.has('sku') || !colSet.has('stock_qty')) {
      throw new Error(`${STOCK_TABLE} must have sku and stock_qty columns.`);
    }

    const [rows] = await connection.query(
      `SELECT * FROM ${qid(STOCK_TABLE)} WHERE sku = ? LIMIT 1 FOR UPDATE`,
      [resolvedSku],
    );
    const current = rows[0];
    if (!current) {
      await connection.rollback();
      const response = { deducted: false, reason: 'SKU_NOT_FOUND', local_sku: resolvedSku, movement_id: null };
      await writeInventoryDeductionLog({ source_type, source_order_id, source_item_id, sku, local_sku: resolvedSku, qty: orderQty, status: 'FAILED', message: 'SKU not found in inventory', meta: response });
      return response;
    }

    const beforeQty = toInt(current.stock_qty, 0);
    if (!ALLOW_NEGATIVE && beforeQty < orderQty) {
      await connection.rollback();
      const response = { deducted: false, reason: 'INSUFFICIENT_STOCK', local_sku: resolvedSku, movement_id: null, available_stock: beforeQty };
      await writeInventoryDeductionLog({ source_type, source_order_id, source_item_id, sku, local_sku: resolvedSku, qty: orderQty, status: 'FAILED', message: 'Insufficient stock', meta: response });
      return response;
    }

    const afterQty = beforeQty - orderQty;
    const reservedQty = toInt(current.reserved_qty, 0);
    const nextAvailable = Math.max(afterQty - reservedQty, 0);

    const updateParts = ['stock_qty = ?'];
    const values = [afterQty];
    if (colSet.has('available_qty')) {
      updateParts.push('available_qty = ?');
      values.push(nextAvailable);
    }
    if (colSet.has('updated_at')) updateParts.push('updated_at = NOW()');
    if (colSet.has('updated_by')) {
      updateParts.push('updated_by = ?');
      values.push(created_by || null);
    }
    values.push(resolvedSku);

    await connection.query(
      `UPDATE ${qid(STOCK_TABLE)} SET ${updateParts.join(', ')} WHERE sku = ?`,
      values,
    );

    const movementId = await insertMovement(connection, {
      sku: resolvedSku,
      movement_type: 'OUT',
      reference_type: source_type || 'ORDER',
      reference_id: source_order_id || null,
      qty_before: beforeQty,
      qty_change: -orderQty,
      qty_after: afterQty,
      cost_price: current.cost_price || 0,
      note: `${source_type || 'ORDER'} stock deducted for order ${source_order_id || ''}`,
      created_by,
    });

    await connection.commit();

    const response = { deducted: true, reason: null, local_sku: resolvedSku, movement_id: movementId, qty_before: beforeQty, qty_after: afterQty };
    await writeInventoryDeductionLog({ source_type, source_order_id, source_item_id, sku, local_sku: resolvedSku, qty: orderQty, status: 'SUCCESS', movement_id: movementId, message: 'Stock deducted', meta: response });
    return response;
  } catch (error) {
    await connection.rollback();
    const response = { deducted: false, reason: error.message, local_sku: resolvedSku, movement_id: null };
    await writeInventoryDeductionLog({ source_type, source_order_id, source_item_id, sku, local_sku: resolvedSku, qty: orderQty, status: 'FAILED', message: error.message, meta: response });
    return response;
  } finally {
    connection.release();
  }
}

module.exports = { deductStockForOrderItem };
