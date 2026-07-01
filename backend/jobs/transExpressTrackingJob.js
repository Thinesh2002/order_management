const { orderDb } = require('../config/db');
const { checkTracking } = require('../services/transExpressService');
const { isPlatformAutoSyncEnabled } = require('../services/syncSettingService');

let running = false;
let timer = null;

async function runTrackingCheck() {
  if (running) return;
  running = true;
  try {
    if (!(await isPlatformAutoSyncEnabled('TRANS_EXPRESS'))) return;

    const [rows] = await orderDb.query(
      `SELECT * FROM trans_express_waybills
       WHERE last_tracking_checked_at IS NULL
          OR last_tracking_checked_at <= DATE_SUB(NOW(), INTERVAL 3 HOUR)
       ORDER BY COALESCE(last_tracking_checked_at, created_at) ASC
       LIMIT 50`,
    );

    for (const waybill of rows) {
      try {
        await checkTracking(waybill);
      } catch (error) {
        console.error('[TRANS_EXPRESS_TRACKING_JOB_ITEM_ERROR]', waybill.waybill_id, error.message);
      }
    }
  } catch (error) {
    console.error('[TRANS_EXPRESS_TRACKING_JOB_ERROR]', error.message);
  } finally {
    running = false;
  }
}

function startTrackingJob() {
  if (String(process.env.TRANS_EXPRESS_AUTO_TRACKING || 'true').toLowerCase() === 'false') return;

  if (timer) clearInterval(timer);

  const intervalMs = Number(process.env.TRANS_EXPRESS_TRACKING_INTERVAL_MS || 3 * 60 * 60 * 1000);
  timer = setInterval(runTrackingCheck, intervalMs);

  setTimeout(runTrackingCheck, 10000);
  console.log(`Trans Express tracking job scheduled: every ${Math.round(intervalMs / 60000)} minutes`);
}

module.exports = { startTrackingJob, runTrackingCheck };
