const syncSettingModel = require('../models/syncSettingModel');
const { PLATFORM_CODES } = require('../constants/orderConstants');

function normalizePlatform(platform) {
  return String(platform || '').trim().toUpperCase();
}

async function listSyncSettings() {
  return syncSettingModel.listSyncSettings();
}

async function getSyncSetting(platform) {
  return syncSettingModel.findSyncSetting(normalizePlatform(platform));
}

async function updateSyncSetting(platform, payload = {}) {
  const platformCode = normalizePlatform(platform || payload.platform_code);
  if (!PLATFORM_CODES.includes(platformCode)) {
    throw Object.assign(new Error('platform must be DARAZ, WOO or TRANS_EXPRESS'), { statusCode: 400 });
  }

  const syncEnabled = payload.sync_enabled === undefined ? 1 : Number(payload.sync_enabled) ? 1 : 0;
  const autoEnabled = payload.auto_sync_enabled === undefined ? 1 : Number(payload.auto_sync_enabled) ? 1 : 0;
  const interval = Math.max(Number(payload.sync_interval_minutes || 5), 5);
  const days = Math.max(Number(payload.fetch_order_days || payload.days || 7), 1);

  return syncSettingModel.upsertSyncSetting(platformCode, {
    sync_enabled: syncEnabled,
    auto_sync_enabled: autoEnabled,
    sync_interval_minutes: interval,
    fetch_order_days: days,
  });
}

async function isAnyMarketplaceAutoSyncEnabled() {
  const rows = await listSyncSettings().catch(() => []);
  if (!rows.length) return true;
  return rows.some((row) => ['DARAZ', 'WOO'].includes(String(row.platform_code || '').toUpperCase())
    && Number(row.sync_enabled) === 1
    && Number(row.auto_sync_enabled) === 1);
}

async function isPlatformAutoSyncEnabled(platform) {
  const setting = await getSyncSetting(platform).catch(() => null);
  if (!setting) return true;
  return Number(setting.sync_enabled) === 1 && Number(setting.auto_sync_enabled) === 1;
}

module.exports = {
  listSyncSettings,
  getSyncSetting,
  updateSyncSetting,
  isAnyMarketplaceAutoSyncEnabled,
  isPlatformAutoSyncEnabled,
};
