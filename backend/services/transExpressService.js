const axios = require('axios');
const { orderDb } = require('../config/db');
const { clean, safeJson } = require('../utils/dbUtils');
const { writeTransExpressLog } = require('./logService');

function transClient() {
  const baseURL = clean(process.env.TRANS_EXPRESS_BASE_URL);
  if (!baseURL) return null;
  const apiKey = clean(process.env.TRANS_EXPRESS_API_KEY);
  const headerName = clean(process.env.TRANS_EXPRESS_AUTH_HEADER || 'Authorization');
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers[headerName] = headerName.toLowerCase() === 'authorization' && !apiKey.toLowerCase().startsWith('bearer ') ? `Bearer ${apiKey}` : apiKey;
  return axios.create({ baseURL, timeout: Number(process.env.TRANS_EXPRESS_TIMEOUT_MS || 30000), headers });
}

function normalizeWaybillResponse(responseData, fallbackOrderNo) {
  const data = responseData || {};
  const nested = data.data || data.result || data.order || data;
  const waybill = clean(nested.waybill_id || nested.waybill || nested.waybillNo || nested.waybill_number || nested.tracking_number || nested.tracking_no || nested.reference_no || fallbackOrderNo);
  const tracking = clean(nested.tracking_number || nested.tracking_no || nested.waybill_id || nested.waybill || waybill);
  const status = clean(nested.status || nested.order_status || data.status || 'Created') || 'Created';
  return { waybill_id: waybill, tracking_number: tracking, courier_status: status, raw: data };
}

function buildWaybillPayload(order) {
  return {
    order_no: order.order_no || order.display_order_no,
    customer_name: order.customer_name,
    receiver_name: order.shipping_name || order.customer_name,
    receiver_phone: order.shipping_phone || order.customer_phone,
    receiver_address: order.shipping_address,
    receiver_city: order.shipping_city,
    cod_amount: Number(order.grand_total || 0),
    weight: Number(order.weight || 1),
    items: order.items || [],
  };
}

async function createWaybill(order) {
  const payload = buildWaybillPayload(order);
  const client = transClient();
  let normalized;

  if (!client) {
    normalized = {
      waybill_id: `TX-${Date.now()}-${order.source_order_id || order.id}`,
      tracking_number: `TX-${Date.now()}-${order.source_order_id || order.id}`,
      courier_status: 'Created Local',
      raw: { local_only: true, message: 'TRANS_EXPRESS_BASE_URL is not configured' },
    };
  } else {
    const path = process.env.TRANS_EXPRESS_CREATE_ORDER_PATH || '/api/order/create';
    try {
      const response = await client.post(path, payload);
      normalized = normalizeWaybillResponse(response.data, order.order_no || order.display_order_no);
      await writeTransExpressLog({ action: 'CREATE_WAYBILL', endpoint: path, status_code: response.status, request_payload: payload, response_payload: response.data });
    } catch (error) {
      await writeTransExpressLog({ action: 'CREATE_WAYBILL_ERROR', endpoint: path, request_payload: payload, response_payload: error.response?.data, error_message: error.message, status_code: error.response?.status });
      throw new Error(error.response?.data?.message || error.message || 'Trans Express waybill create failed');
    }
  }

  const [existing] = await orderDb.query('SELECT * FROM trans_express_waybills WHERE source_type = ? AND source_order_id = ? LIMIT 1', [order.source_type, order.source_order_id]);
  if (existing[0]) return existing[0];

  const [result] = await orderDb.query(
    `INSERT INTO trans_express_waybills
      (source_type, source_order_id, source_order_no, waybill_id, tracking_number, courier_status,
       receiver_name, receiver_phone, receiver_address, receiver_city, cod_amount, weight, request_payload, response_payload, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.source_type,
      order.source_order_id,
      order.order_no || order.display_order_no,
      normalized.waybill_id,
      normalized.tracking_number,
      normalized.courier_status,
      payload.receiver_name,
      payload.receiver_phone,
      payload.receiver_address,
      payload.receiver_city,
      payload.cod_amount,
      payload.weight,
      safeJson(payload),
      safeJson(normalized.raw),
      order.created_by || null,
    ],
  );

  const [rows] = await orderDb.query('SELECT * FROM trans_express_waybills WHERE id = ?', [result.insertId]);
  return rows[0];
}


async function addManualWaybill(order) {
  const waybillId = clean(order.waybill_id || order.tracking_number);
  if (!waybillId) throw Object.assign(new Error('Waybill ID is required.'), { statusCode: 400 });

  const [existing] = await orderDb.query(
    'SELECT * FROM trans_express_waybills WHERE source_type = ? AND source_order_id = ? LIMIT 1',
    [order.source_type, order.source_order_id],
  );
  if (existing[0]) return existing[0];

  const payload = buildWaybillPayload(order);
  const [result] = await orderDb.query(
    `INSERT INTO trans_express_waybills
      (source_type, source_order_id, source_order_no, waybill_id, tracking_number, courier_status, receiver_name, receiver_phone,
       receiver_address, receiver_city, cod_amount, weight, request_payload, response_payload, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.source_type,
      order.source_order_id,
      order.order_no || order.display_order_no,
      waybillId,
      clean(order.tracking_number || waybillId),
      clean(order.courier_status || 'Created Manual'),
      payload.receiver_name,
      payload.receiver_phone,
      payload.receiver_address,
      payload.receiver_city,
      payload.cod_amount,
      payload.weight,
      safeJson({ manual_waybill: true, ...payload }),
      safeJson({ manual_waybill: true }),
      order.created_by || null,
    ],
  );
  const [rows] = await orderDb.query('SELECT * FROM trans_express_waybills WHERE id = ?', [result.insertId]);
  return rows[0];
}

function normalizeTrackingEvents(responseData) {
  const data = responseData || {};
  const eventList = data.events || data.tracking || data.data?.events || data.data?.tracking || data.data || [];
  const rows = Array.isArray(eventList) ? eventList : [eventList];
  return rows.filter(Boolean).map((event) => ({
    tracking_status: clean(event.status || event.tracking_status || event.name || event.event || data.status || 'Updated') || 'Updated',
    tracking_description: event.description || event.message || event.remark || null,
    tracking_location: event.location || event.branch || event.city || null,
    event_time: event.event_time || event.date || event.datetime || event.created_at || null,
    raw_payload: event,
  }));
}

async function checkTracking(waybillRow) {
  const client = transClient();
  let events = [];
  let responsePayload = null;

  if (!client) {
    events = [{
      tracking_status: waybillRow.courier_status || 'Created Local',
      tracking_description: 'Local tracking only. Configure Trans Express API in .env to fetch live tracking.',
      tracking_location: null,
      event_time: new Date(),
      raw_payload: { local_only: true },
    }];
  } else {
    const path = process.env.TRANS_EXPRESS_TRACKING_PATH || '/api/order/track';
    const method = clean(process.env.TRANS_EXPRESS_TRACKING_METHOD || 'GET').toUpperCase();
    try {
      const response = method === 'POST'
        ? await client.post(path, { waybill_id: waybillRow.waybill_id, tracking_number: waybillRow.tracking_number })
        : await client.get(path, { params: { waybill_id: waybillRow.waybill_id, tracking_number: waybillRow.tracking_number } });
      responsePayload = response.data;
      events = normalizeTrackingEvents(response.data);
      await writeTransExpressLog({ action: 'CHECK_TRACKING', endpoint: path, status_code: response.status, request_payload: { waybill_id: waybillRow.waybill_id }, response_payload: response.data });
    } catch (error) {
      await writeTransExpressLog({ action: 'CHECK_TRACKING_ERROR', endpoint: path, request_payload: { waybill_id: waybillRow.waybill_id }, response_payload: error.response?.data, error_message: error.message, status_code: error.response?.status });
      throw new Error(error.response?.data?.message || error.message || 'Trans Express tracking check failed');
    }
  }

  for (const event of events) {
    await orderDb.query(
      `INSERT INTO trans_express_tracking_events
        (waybill_id, tracking_status, tracking_description, tracking_location, event_time, raw_payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        waybillRow.id,
        event.tracking_status,
        event.tracking_description,
        event.tracking_location,
        event.event_time ? new Date(event.event_time) : new Date(),
        safeJson(event.raw_payload),
      ],
    );
  }

  const latest = events[events.length - 1];
  await orderDb.query(
    `UPDATE trans_express_waybills
     SET courier_status = COALESCE(?, courier_status), response_payload = COALESCE(?, response_payload), last_tracking_checked_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [latest?.tracking_status || null, responsePayload ? safeJson(responsePayload) : null, waybillRow.id],
  );

  const [rows] = await orderDb.query('SELECT * FROM trans_express_tracking_events WHERE waybill_id = ? ORDER BY event_time DESC, id DESC', [waybillRow.id]);
  return rows;
}

async function getTrackingByAnyId(trackingId) {
  const [waybills] = await orderDb.query(
    'SELECT * FROM trans_express_waybills WHERE id = ? OR waybill_id = ? OR tracking_number = ? LIMIT 1',
    [trackingId, trackingId, trackingId],
  );
  if (!waybills[0]) return null;
  const [events] = await orderDb.query('SELECT * FROM trans_express_tracking_events WHERE waybill_id = ? ORDER BY event_time DESC, id DESC', [waybills[0].id]);
  return { waybill: waybills[0], events };
}

module.exports = { createWaybill, addManualWaybill, checkTracking, getTrackingByAnyId };
