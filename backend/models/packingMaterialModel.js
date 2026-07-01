const { orderDb } = require('../config/db');

async function listMaterials({ search } = {}) {
  const values = [];
  let where = '';
  if (search) {
    where = 'WHERE material_code LIKE ? OR material_name LIKE ? OR material_type LIKE ? OR supplier_name LIKE ?';
    values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [rows] = await orderDb.query(`SELECT * FROM packing_materials ${where} ORDER BY updated_at DESC, id DESC`, values);
  return rows;
}

async function findMaterialById(id) {
  const [rows] = await orderDb.query('SELECT * FROM packing_materials WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createMaterial(payload) {
  const [result] = await orderDb.query(
    `INSERT INTO packing_materials
      (material_code, material_name, material_type, unit, current_qty, reorder_level, unit_cost, supplier_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.material_code, payload.material_name, payload.material_type || null, payload.unit || 'pcs', payload.current_qty || 0, payload.reorder_level || 0, payload.unit_cost || 0, payload.supplier_name || null, payload.status || 'ACTIVE'],
  );
  return result.insertId;
}

async function updateMaterial(id, payload) {
  await orderDb.query(
    `UPDATE packing_materials
     SET material_code = ?, material_name = ?, material_type = ?, unit = ?, reorder_level = ?, unit_cost = ?, supplier_name = ?, status = ?, updated_at = NOW()
     WHERE id = ?`,
    [payload.material_code, payload.material_name, payload.material_type || null, payload.unit || 'pcs', payload.reorder_level || 0, payload.unit_cost || 0, payload.supplier_name || null, payload.status || 'ACTIVE', id],
  );
}

async function addMovement(materialId, payload) {
  const sign = payload.movement_type === 'OUT' ? -1 : 1;
  const qty = Math.abs(Number(payload.qty || 0));
  await orderDb.query(
    `INSERT INTO packing_material_movements
      (material_id, movement_type, qty, unit_cost, reference_type, reference_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [materialId, payload.movement_type || 'IN', qty, payload.unit_cost || 0, payload.reference_type || null, payload.reference_id || null, payload.note || null, payload.created_by || null],
  );
  await orderDb.query('UPDATE packing_materials SET current_qty = current_qty + ?, updated_at = NOW() WHERE id = ?', [sign * qty, materialId]);
}

async function listMovements(materialId) {
  const [rows] = await orderDb.query('SELECT * FROM packing_material_movements WHERE material_id = ? ORDER BY created_at DESC, id DESC', [materialId]);
  return rows;
}

module.exports = {
  listMaterials,
  findMaterialById,
  createMaterial,
  updateMaterial,
  addMovement,
  listMovements,
};
