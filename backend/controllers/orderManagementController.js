const orderService = require('../services/orderService');
const packingService = require('../services/packingMaterialService');
const { getTrackingByAnyId, checkTracking } = require('../services/transExpressService');
const productLookup = require('../services/productLookupService');
const accountService = require('../services/marketplaceAccountService');
const syncService = require('../services/marketplaceOrderSyncService');
const { listLogs } = require('../services/logService');
const darazActions = require('../services/darazOrderActionService');
const syncSettingService = require('../services/syncSettingService');

async function dashboard(req, res) {
  const data = await orderService.getDashboardSummary();
  res.json({ success: true, data });
}

async function listOrders(req, res) {
  const data = await orderService.listUnifiedOrders(req.query);
  res.json({ success: true, ...data });
}

async function createManualOrder(req, res) {
  const data = await orderService.createManualOrder(req.body);
  res.status(201).json({ success: true, data });
}

async function getOrder(req, res) {
  const data = await orderService.getOrderDetail(req.params.source, req.params.id, req.query || {});
  if (!data) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data });
}

async function updateManualStatus(req, res) {
  const data = await orderService.updateManualOrderStatus(req.params.id, req.body.status, req.body.user_id || null, req.body || {});
  res.json({ success: true, data });
}

async function updateOrderStatus(req, res) {
  const data = await orderService.updateOrderStatus(req.params.source, req.params.id, req.body.status, req.body.user_id || null, req.body || {});
  res.json({ success: true, data });
}

async function createWaybill(req, res) {
  const data = await orderService.createWaybillForOrder(req.params.source, req.params.id, req.body.user_id || null, req.body || {});
  res.status(201).json({ success: true, data });
}

async function trackingDetail(req, res) {
  const data = await getTrackingByAnyId(req.params.trackingId);
  if (!data) return res.status(404).json({ success: false, message: 'Tracking details not found' });
  res.json({ success: true, data });
}

async function checkTrackingNow(req, res) {
  const data = await getTrackingByAnyId(req.params.trackingId);
  if (!data) return res.status(404).json({ success: false, message: 'Tracking details not found' });
  const events = await checkTracking(data.waybill);
  const refreshed = await getTrackingByAnyId(req.params.trackingId);
  res.json({ success: true, data: refreshed, events });
}

async function listMaterials(req, res) {
  const data = await packingService.listMaterials(req.query);
  res.json({ success: true, data });
}

async function saveMaterial(req, res) {
  const data = await packingService.saveMaterial(req.body);
  res.json({ success: true, data });
}

async function materialMovement(req, res) {
  const data = await packingService.addMaterialMovement(req.params.id, req.body);
  res.json({ success: true, data });
}

async function materialMovements(req, res) {
  const data = await packingService.listMaterialMovements(req.params.id);
  res.json({ success: true, data });
}


async function searchProducts(req, res) {
  const data = await productLookup.searchProducts(req.query);
  res.json({ success: true, data });
}

async function productBySku(req, res) {
  const data = await productLookup.findBySku(req.params.sku);
  if (!data) return res.status(404).json({ success: false, message: 'SKU not found in existing inventory/product tables.' });
  res.json({ success: true, data });
}

async function accountStatus(req, res) {
  const data = await accountService.accountStatusSummary();
  res.json({ success: true, data });
}

async function accountDiagnostics(req, res) {
  const data = await accountService.accountSchemaDiagnostics();
  res.json({ success: true, data });
}

async function filterOptions(req, res) {
  const data = await accountService.dropdownValues();
  res.json({ success: true, data });
}

async function syncDaraz(req, res) {
  const data = await syncService.syncDarazOrders({ ...req.query, ...req.body });
  res.json({ success: true, data });
}

async function syncWoo(req, res) {
  const data = await syncService.syncWooOrders({ ...req.query, ...req.body });
  res.json({ success: true, data });
}

async function syncAll(req, res) {
  const data = await syncService.syncAllOrders({ ...req.query, ...req.body });
  res.json({ success: true, data });
}

async function syncSettings(req, res) {
  const data = await syncSettingService.listSyncSettings();
  res.json({ success: true, data });
}

async function updateSyncSetting(req, res) {
  const data = await syncSettingService.updateSyncSetting(req.params.platform || req.body.platform_code, req.body || {});
  res.json({ success: true, data });
}

async function logs(req, res) {
  const data = await listLogs(req.query);
  res.json({ success: true, data });
}

async function darazBulkAction(req, res) {
  const data = await darazActions.darazBulkAction(req.body || {});
  res.json({ success: !data.errors?.length, data });
}

module.exports = {
  dashboard,
  listOrders,
  createManualOrder,
  getOrder,
  updateManualStatus,
  updateOrderStatus,
  createWaybill,
  trackingDetail,
  checkTrackingNow,
  listMaterials,
  saveMaterial,
  materialMovement,
  materialMovements,
  searchProducts,
  productBySku,
  accountStatus,
  accountDiagnostics,
  filterOptions,
  syncDaraz,
  syncWoo,
  syncAll,
  syncSettings,
  updateSyncSetting,
  logs,
  darazBulkAction,
};
