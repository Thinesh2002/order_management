require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const orderRoutes = require('./routes/orderManagementRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { notFoundHandler } = require('./middlewares/notFoundHandler');

const app = express();

const PORT = Number(process.env.PORT || 5050);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((value) => value.trim()).filter(Boolean)
  : [
      'https://orders.teckvora.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.options('*', cors());

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'cm_order_management',
    port: PORT,
    order_db: process.env.ORDER_DB_NAME || 'cm_order_management',
    frontend_url: allowedOrigins,
    time: new Date().toISOString(),
  });
});

app.use('/api/order-management', orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;