import api, { unwrap } from './client';

const base = '/order-management';

const enc = (value) => encodeURIComponent(String(value));

export const orderApi = {
  dashboard: () =>
    api.get(`${base}/dashboard`).then(unwrap),

  listOrders: (params) =>
    api.get(`${base}/orders`, { params }).then(unwrap),

  getOrder: (source, id, params = {}) =>
    api.get(`${base}/orders/${enc(source)}/${enc(id)}`, { params }).then(unwrap),

  createManualOrder: (payload) =>
    api.post(`${base}/manual-orders`, payload).then(unwrap),

  searchProducts: (params) =>
    api.get(`${base}/products/search`, { params }).then(unwrap),

  productBySku: (sku) =>
    api.get(`${base}/products/sku/${enc(sku)}`).then(unwrap),

  updateManualStatus: (id, payload) =>
    api
      .patch(
        `${base}/manual-orders/${enc(id)}/status`,
        typeof payload === 'string' ? { status: payload } : payload
      )
      .then(unwrap),

  createWaybill: (source, id, payload = {}) =>
    api.post(`${base}/orders/${enc(source)}/${enc(id)}/waybill`, payload).then(unwrap),

  getTracking: (trackingId) =>
    api.get(`${base}/tracking/${enc(trackingId)}`).then(unwrap),

  checkTracking: (trackingId) =>
    api.post(`${base}/tracking/${enc(trackingId)}/check`, {}).then(unwrap),

  listMaterials: (params) =>
    api.get(`${base}/packing-materials`, { params }).then(unwrap),

  saveMaterial: (payload) =>
    api.post(`${base}/packing-materials`, payload).then(unwrap),

  addMaterialMovement: (id, payload) =>
    api.post(`${base}/packing-materials/${enc(id)}/movements`, payload).then(unwrap),

  syncSettings: () =>
    api.get(`${base}/sync-settings`).then(unwrap),

  updateSyncSetting: (platform, payload) =>
    api.patch(`${base}/sync-settings/${enc(platform)}`, payload).then(unwrap),

  logs: (params) =>
    api.get(`${base}/logs`, { params }).then(unwrap),

  accountStatus: () =>
    api.get(`${base}/accounts/status`).then(unwrap),

  filterOptions: () =>
    api.get(`${base}/filters/options`).then(unwrap),

  syncDaraz: (payload = {}) =>
    api.post(`${base}/sync/daraz`, payload).then(unwrap),

  syncWoo: (payload = {}) =>
    api.post(`${base}/sync/woo`, payload).then(unwrap),

  syncAll: (payload = {}) =>
    api.post(`${base}/sync/all`, payload).then(unwrap),

  darazBulkAction: (payload = {}) =>
    api.post(`${base}/daraz/actions/bulk`, payload).then(unwrap),
};