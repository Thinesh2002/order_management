require('dotenv').config();
const app = require('./app');
const { startTrackingJob } = require('./jobs/transExpressTrackingJob');
const { startMarketplaceOrderSyncJob } = require('./jobs/marketplaceOrderSyncJob');
const { closeAllPools } = require('./config/db');

const PORT = Number(process.env.PORT || 5050);

const server = app.listen(PORT, () => {
  console.log(`Order Management backend running: http://localhost:${PORT}`);
  startTrackingJob();
  startMarketplaceOrderSyncJob();
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing Order Management backend...`);
  server.close(async () => {
    await closeAllPools();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
