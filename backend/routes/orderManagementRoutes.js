const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/orderManagementController');
const { validateRequest } = require('../middlewares/validateRequest');
const { validateManualOrderPayload } = require('../validators/orderValidator');

const router = express.Router();

router.get('/dashboard', asyncHandler(controller.dashboard));
router.get('/accounts/status', asyncHandler(controller.accountStatus));
router.get('/accounts/diagnostics', asyncHandler(controller.accountDiagnostics));
router.get('/filters/options', asyncHandler(controller.filterOptions));
router.post('/sync/daraz', asyncHandler(controller.syncDaraz));
router.post('/sync/woo', asyncHandler(controller.syncWoo));
router.post('/sync/all', asyncHandler(controller.syncAll));
router.post('/daraz/actions/bulk', asyncHandler(controller.darazBulkAction));
router.get('/orders', asyncHandler(controller.listOrders));
router.get('/products/search', asyncHandler(controller.searchProducts));
router.get('/products/sku/:sku', asyncHandler(controller.productBySku));
router.post('/manual-orders', validateRequest(validateManualOrderPayload), asyncHandler(controller.createManualOrder));
router.patch('/manual-orders/:id/status', asyncHandler(controller.updateManualStatus));
router.post('/manual-orders/:id/status', asyncHandler(controller.updateManualStatus));
router.patch('/orders/:source/:id/status', asyncHandler(controller.updateOrderStatus));
router.post('/orders/:source/:id/status', asyncHandler(controller.updateOrderStatus));
router.get('/orders/:source/:id', asyncHandler(controller.getOrder));
router.post('/orders/:source/:id/waybill', asyncHandler(controller.createWaybill));

router.get('/tracking/:trackingId', asyncHandler(controller.trackingDetail));
router.post('/tracking/:trackingId/check', asyncHandler(controller.checkTrackingNow));

router.get('/packing-materials', asyncHandler(controller.listMaterials));
router.post('/packing-materials', asyncHandler(controller.saveMaterial));
router.put('/packing-materials/:id', asyncHandler(controller.saveMaterial));
router.post('/packing-materials/:id/movements', asyncHandler(controller.materialMovement));
router.get('/packing-materials/:id/movements', asyncHandler(controller.materialMovements));

router.get('/sync-settings', asyncHandler(controller.syncSettings));
router.patch('/sync-settings/:platform', asyncHandler(controller.updateSyncSetting));
router.get('/logs', asyncHandler(controller.logs));

module.exports = router;
