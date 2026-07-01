const { orderDb } = require('../config/db');

async function listSyncSettings() {
  const [rows] = await orderDb.query('SELECT * FROM order_sync_settings ORDER BY platform_code ASC');
  return rows;
}

async function findSyncSetting(platformCode) {
  const [[row]] = await orderDb.query(
    'SELECT * FROM order_sync_settings WHERE platform_code = ? LIMIT 1',
    [String(platformCode || '').toUpperCase()],
  ).catch(() => [[null]]);
  return row || null;
}

async function upsertSyncSetting(platformCode, payload = {}) {
  const platform = String(platformCode || '').trim().toUpperCase();
  await orderDb.query(
    `INSERT INTO order_sync_settings (platform_code, sync_enabled, auto_sync_enabled, sync_interval_minutes, fetch_order_days, last_sync_status, next_sync_at)
     VALUES (?, ?, ?, ?, ?, 'never', DATE_ADD(NOW(), INTERVAL ? MINUTE))
     ON DUPLICATE KEY UPDATE
       sync_enabled = VALUES(sync_enabled),
       auto_sync_enabled = VALUES(auto_sync_enabled),
       sync_interval_minutes = VALUES(sync_interval_minutes),
       fetch_order_days = VALUES(fetch_order_days),
       next_sync_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
       updated_at = NOW()`,
    [platform, payload.sync_enabled, payload.auto_sync_enabled, payload.sync_interval_minutes, payload.fetch_order_days, payload.sync_interval_minutes, payload.sync_interval_minutes],
  );
  return findSyncSetting(platform);
}

async function markSyncRun(platformCode, payload = {}) {
  await orderDb.query(
    `UPDATE order_sync_settings
     SET last_sync_at = NOW(), last_sync_status = ?, last_sync_message = ?, next_sync_at = DATE_ADD(NOW(), INTERVAL sync_interval_minutes MINUTE), updated_at = NOW()
     WHERE platform_code = ?`,
    [payload.status || 'success', payload.message || null, String(platformCode || '').toUpperCase()],
  ).catch(() => null);
}

module.exports = {
  listSyncSettings,
  findSyncSetting,
  upsertSyncSetting,
  markSyncRun,
};
