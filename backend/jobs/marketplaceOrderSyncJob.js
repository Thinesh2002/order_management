const { syncAllOrders } = require('../services/marketplaceOrderSyncService');
const { isAnyMarketplaceAutoSyncEnabled } = require('../services/syncSettingService');

let running = false;
let timer = null;

async function shouldRun() {
  return isAnyMarketplaceAutoSyncEnabled();
}

async function runMarketplaceOrderSync() {
  if (running) return { skipped: true, reason: 'SYNC_ALREADY_RUNNING' };
  running = true;
  try {
    if (!(await shouldRun())) return { skipped: true, reason: 'AUTO_SYNC_DISABLED' };
    console.log('[ORDER_SYNC_JOB] Daraz/Woo sync started');
    const result = await syncAllOrders({ limit: Number(process.env.ORDER_SYNC_LIMIT || 50) });
    console.log('[ORDER_SYNC_JOB] Daraz/Woo sync finished', {
      daraz_orders: result.daraz?.total_orders || 0,
      woo_orders: result.woo?.total_orders || 0,
    });
    return result;
  } catch (error) {
    console.error('[ORDER_SYNC_JOB_ERROR]', error.message);
    return { error: error.message };
  } finally {
    running = false;
  }
}

function startMarketplaceOrderSyncJob() {
  if (String(process.env.ORDER_AUTO_SYNC_ENABLED || 'true').toLowerCase() === 'false') return;
  if (timer) clearInterval(timer);
  const intervalMs = Number(process.env.ORDER_AUTO_SYNC_INTERVAL_MS || 5 * 60 * 1000);
  timer = setInterval(runMarketplaceOrderSync, intervalMs);
  setTimeout(runMarketplaceOrderSync, Number(process.env.ORDER_AUTO_SYNC_START_DELAY_MS || 15000));
  console.log(`Daraz/Woo order sync job scheduled: every ${Math.round(intervalMs / 60000)} minutes`);
}

module.exports = { startMarketplaceOrderSyncJob, runMarketplaceOrderSync };
