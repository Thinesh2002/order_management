import api, { unwrap } from './client';

const base = '/order-management';

export const orderApi = {
  dashboard: () => api.get(`${base}/dashboard`).then(unwrap),
  listOrders: (params) => api.get(`${base}/orders`, { params }).then(unwrap),
  getOrder: (source, id, params = {}) => api.get(`${base}/orders/${source}/${id}`, { params }).then(unwrap),
  createManualOrder: (payload) => api.post(`${base}/manual-orders`, payload).then(unwrap),
  searchProducts: (params) => api.get(`${base}/products/search`, { params }).then(unwrap),
  productBySku: (sku) => api.get(`${base}/products/sku/${encodeURIComponent(sku)}`).then(unwrap),
  updateManualStatus: (id, payload) => api.patch(`${base}/manual-orders/${id}/status`, typeof payload === 'string' ? { status: payload } : payload).then(unwrap),
  createWaybill: (source, id, payload = {}) => api.post(`${base}/orders/${source}/${id}/waybill`, payload).then(unwrap),
  getTracking: (trackingId) => api.get(`${base}/tracking/${trackingId}`).then(unwrap),
  checkTracking: (trackingId) => api.post(`${base}/tracking/${trackingId}/check`, {}).then(unwrap),
  listMaterials: (params) => api.get(`${base}/packing-materials`, { params }).then(unwrap),
  saveMaterial: (payload) => api.post(`${base}/packing-materials`, payload).then(unwrap),
  addMaterialMovement: (id, payload) => api.post(`${base}/packing-materials/${id}/movements`, payload).then(unwrap),
  syncSettings: () => api.get(`${base}/sync-settings`).then(unwrap),
  updateSyncSetting: (platform, payload) => api.patch(`${base}/sync-settings/${platform}`, payload).then(unwrap),
  logs: (params) => api.get(`${base}/logs`, { params }).then(unwrap),
  accountStatus: () => api.get(`${base}/accounts/status`).then(unwrap),
  filterOptions: () => api.get(`${base}/filters/options`).then(unwrap),
  syncDaraz: (payload = {}) => api.post(`${base}/sync/daraz`, payload).then(unwrap),
  syncWoo: (payload = {}) => api.post(`${base}/sync/woo`, payload).then(unwrap),
  syncAll: (payload = {}) => api.post(`${base}/sync/all`, payload).then(unwrap),
  darazBulkAction: (payload = {}) => api.post(`${base}/daraz/actions/bulk`, payload).then(unwrap),
};
