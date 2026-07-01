const { orderDb } = require('../config/db');
const baseModel = require('./baseModel');

function findWaybillById(id) {
  return baseModel.findById(orderDb, 'trans_express_waybills', id);
}

async function findWaybillBySource(sourceType, sourceOrderId) {
  const [rows] = await orderDb.query(
    'SELECT * FROM trans_express_waybills WHERE source_type = ? AND source_order_id = ? LIMIT 1',
    [sourceType, sourceOrderId],
  );
  return rows[0] || null;
}

async function findWaybillByAnyId(trackingId) {
  const [rows] = await orderDb.query(
    'SELECT * FROM trans_express_waybills WHERE id = ? OR waybill_id = ? OR tracking_number = ? LIMIT 1',
    [trackingId, trackingId, trackingId],
  );
  return rows[0] || null;
}

async function listTrackingEvents(waybillRowId) {
  const [rows] = await orderDb.query(
    'SELECT * FROM trans_express_tracking_events WHERE waybill_id = ? ORDER BY event_time DESC, id DESC',
    [waybillRowId],
  );
  return rows;
}

module.exports = {
  findWaybillById,
  findWaybillBySource,
  findWaybillByAnyId,
  listTrackingEvents,
};
