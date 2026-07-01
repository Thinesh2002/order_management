require('dotenv').config();

const app = require('./app');
const { startTrackingJob } = require('./jobs/transExpressTrackingJob');
const { startMarketplaceOrderSyncJob } = require('./jobs/marketplaceOrderSyncJob');
const { closeAllPools } = require('./config/db');

const PORT = Number(process.env.PORT || 5050);

const server = app.listen(PORT, () => {
  console.log(`Order Management backend running: http://localhost:${PORT}`);

  try {
    startTrackingJob();
  } catch (error) {
    console.error('[TRACKING_JOB_START_ERROR]', error);
  }

  try {
    startMarketplaceOrderSyncJob();
  } catch (error) {
    console.error('[MARKETPLACE_SYNC_JOB_START_ERROR]', error);
  }
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing Order Management backend...`);

  server.close(async () => {
    try {
      await closeAllPools();
    } catch (error) {
      console.error('[DB_POOL_CLOSE_ERROR]', error);
    }

    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error);
  process.exit(1);
});