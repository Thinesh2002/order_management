require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const orderRoutes = require('./routes/orderManagementRoutes');
const authRoutes = require('./routes/authRoutes');
const userCompatRoutes = require('./routes/userCompatRoutes');
const { protect } = require('./middlewares/authMiddleware');
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

const corsMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const corsAllowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', corsMethods);
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || corsAllowedHeaders,
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

const corsOptions = {
  origin(origin, callback) {
    // Do not throw inside CORS callback. Throwing here can create a 500/502-looking
    // preflight failure without Access-Control-Allow-Origin in the browser.
    return callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: corsMethods.split(','),
  allowedHeaders: corsAllowedHeaders.split(',').map((value) => value.trim()),
  optionsSuccessStatus: 204,
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

// CORS must run before helmet, body parser, auth middleware and route matching.
// This guarantees POST /api/auth/login preflight OPTIONS receives CORS headers.
app.use((req, res, next) => {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(cors(corsOptions));

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

app.use('/api/auth', authRoutes);
app.use('/api/user', userCompatRoutes);
app.use('/api/order-management', protect, orderRoutes);
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
