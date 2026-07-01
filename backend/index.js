require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const orderRoutes = require('./routes/orderManagementRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { notFoundHandler } = require('./middlewares/notFoundHandler');
const { startTrackingJob } = require('./jobs/transExpressTrackingJob');
const { startMarketplaceOrderSyncJob } = require('./jobs/marketplaceOrderSyncJob');
const { closeAllPools } = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT || 5050);

const defaultAllowedOrigins = [
  'https://orders.teckvora.com',
  'https://orders.api.teckvora.com',
  'https://system.teckvora.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const envAllowedOrigins = String(process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
const teckvoraOriginPattern = /^https:\/\/[a-z0-9-]+\.teckvora\.com$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin) || teckvoraOriginPattern.test(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(Object.assign(new Error(`CORS blocked origin: ${origin}`), { statusCode: 403 }));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'cm_order_management',
    port: PORT,
    order_db: process.env.ORDER_DB_NAME || 'cm_order_management',
    allowed_origins: allowedOrigins,
    time: new Date().toISOString(),
  });
});

app.use('/api/order-management', orderRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

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
