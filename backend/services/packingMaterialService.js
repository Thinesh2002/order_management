const { clean, toNumber } = require('../utils/dbUtils');
const packingMaterialModel = require('../models/packingMaterialModel');

async function listMaterials(params = {}) {
  return packingMaterialModel.listMaterials({ search: clean(params.search || '') });
}

async function saveMaterial(payload = {}) {
  const id = payload.id || null;
  const materialCode = clean(payload.material_code);
  const materialName = clean(payload.material_name);
  if (!materialCode || !materialName) {
    throw Object.assign(new Error('Material code and name are required.'), { statusCode: 400 });
  }

  const data = {
    material_code: materialCode,
    material_name: materialName,
    material_type: payload.material_type || null,
    unit: payload.unit || 'pcs',
    current_qty: toNumber(payload.current_qty, 0),
    reorder_level: toNumber(payload.reorder_level, 0),
    unit_cost: toNumber(payload.unit_cost, 0),
    supplier_name: payload.supplier_name || null,
    status: payload.status || 'ACTIVE',
  };

  if (id) {
    await packingMaterialModel.updateMaterial(id, data);
    return packingMaterialModel.findMaterialById(id);
  }

  const materialId = await packingMaterialModel.createMaterial(data);
  return packingMaterialModel.findMaterialById(materialId);
}

async function addMaterialMovement(materialId, payload = {}) {
  const movementType = clean(payload.movement_type || 'IN').toUpperCase();
  const qty = Math.abs(toNumber(payload.qty, 0));
  if (!qty) throw Object.assign(new Error('Quantity is required.'), { statusCode: 400 });

  await packingMaterialModel.addMovement(materialId, {
    movement_type: movementType,
    qty,
    unit_cost: toNumber(payload.unit_cost, 0),
    reference_type: payload.reference_type || null,
    reference_id: payload.reference_id || null,
    note: payload.note || null,
    created_by: payload.created_by || null,
  });
  return packingMaterialModel.findMaterialById(materialId);
}

async function listMaterialMovements(materialId) {
  return packingMaterialModel.listMovements(materialId);
}

module.exports = { listMaterials, saveMaterial, addMaterialMovement, listMaterialMovements };
