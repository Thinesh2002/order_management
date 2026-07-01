const mysql = require('mysql2/promise');

const createdPools = [];

function envPassword() {
  return process.env.DB_PASS !== undefined ? process.env.DB_PASS : (process.env.DB_PASSWORD || '');
}

function createPool(databaseName) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: envPassword(),
    database: databaseName,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    multipleStatements: false,
    timezone: '+00:00',
  });
  createdPools.push(pool);
  return pool;
}

const orderDb = createPool(process.env.ORDER_DB_NAME || process.env.DB_NAME || 'cm_order_management');
const productDb = createPool(process.env.PM_DB_NAME || process.env.PRODUCT_DB_NAME || 'cm_product_management');
const inventoryDb = createPool(process.env.INVENTORY_DB_NAME || 'cm_inventory_management');
const marketplaceDb = createPool(process.env.MP_DB_NAME || process.env.MARKETPLACE_DB_NAME || 'cm_marketplace_management');
const authDb = createPool(process.env.AUTH_DB_NAME || 'cm_auth_management');
const logDb = createPool(process.env.LOG_DB_NAME || 'cm_logs_management');

async function closeAllPools() {
  await Promise.all(createdPools.map((pool) => pool.end().catch(() => null)));
}

module.exports = {
  createPool,
  orderDb,
  productDb,
  inventoryDb,
  marketplaceDb,
  authDb,
  logDb,
  closeAllPools,
};
