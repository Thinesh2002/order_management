const { productDb, inventoryDb } = require('../config/db');
const { qid, tableExists, getColumns, clean, toInt, toNumber } = require('../utils/dbUtils');

const INVENTORY_TABLE = process.env.INVENTORY_STOCK_TABLE || 'product_inventory';
const PRODUCTS_TABLE = process.env.PRODUCT_TABLE || 'products';
const PRODUCT_IMAGES_TABLE = process.env.PRODUCT_IMAGE_TABLE || 'product_images';

const columnCache = new Map();

function cacheKey(dbName, tableName) {
  return `${dbName || 'db'}:${tableName}`;
}

async function columnsFor(db, tableName) {
  const key = cacheKey(db?.config?.connectionConfig?.database, tableName);
  if (columnCache.has(key)) return columnCache.get(key);
  const exists = await tableExists(db, tableName).catch(() => false);
  if (!exists) {
    columnCache.set(key, []);
    return [];
  }
  const columns = await getColumns(db, tableName).catch(() => []);
  columnCache.set(key, columns);
  return columns;
}

function has(columns, name) {
  return columns.includes(name);
}

function firstValue(row = {}, names = []) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function normalizeImageUrl(row = {}) {
  return firstValue(row, [
    'product_image_url',
    'main_image_url',
    'primary_image_url',
    'image_url',
    'image_path',
    'file_url',
    'file_path',
    'url',
    'src',
    'thumbnail_url',
    'thumbnail',
    'path',
  ]);
}

function normalizeProduct(row = {}, imageUrl = null) {
  const sku = clean(firstValue(row, ['sku', 'local_sku', 'product_sku', 'variant_sku', 'child_sku', 'seller_sku']));
  const title = clean(firstValue(row, [
    'product_title',
    'title',
    'product_name',
    'name',
    'description',
    'item_name',
    'variant_name',
    'model_name',
  ]));

  return {
    product_id: firstValue(row, ['product_id', 'id']) || null,
    variant_id: firstValue(row, ['variant_id']) || null,
    sku,
    local_sku: clean(firstValue(row, ['local_sku', 'sku'])) || sku,
    product_title: title || sku,
    product_image_url: imageUrl || normalizeImageUrl(row) || '',
    stock_qty: toInt(firstValue(row, ['stock_qty', 'quantity', 'qty']), 0),
    available_qty: toInt(firstValue(row, ['available_qty', 'stock_qty', 'quantity', 'qty']), 0),
    cost_price: toNumber(firstValue(row, ['cost_price', 'cost']), 0),
    selling_price: toNumber(firstValue(row, ['selling_price', 'sale_price', 'price', 'unit_price']), 0),
  };
}

async function findProductRowById(productId) {
  if (!productId) return null;
  const columns = await columnsFor(productDb, PRODUCTS_TABLE);
  if (!columns.length) return null;
  const pk = has(columns, 'id') ? 'id' : null;
  if (!pk) return null;
  const [rows] = await productDb.query(`SELECT * FROM ${qid(PRODUCTS_TABLE)} WHERE ${qid(pk)} = ? LIMIT 1`, [productId]);
  return rows[0] || null;
}

async function findImage({ productId, variantId, sku }) {
  const columns = await columnsFor(productDb, PRODUCT_IMAGES_TABLE);
  if (!columns.length) return '';

  const where = [];
  const values = [];

  if (variantId && has(columns, 'variant_id')) {
    where.push(`${qid('variant_id')} = ?`);
    values.push(variantId);
  }
  if (productId && has(columns, 'product_id')) {
    where.push(`${qid('product_id')} = ?`);
    values.push(productId);
  }
  if (sku && has(columns, 'sku')) {
    where.push(`${qid('sku')} = ?`);
    values.push(sku);
  }

  if (!where.length) return '';

  const orderParts = [];
  if (has(columns, 'is_main')) orderParts.push(`${qid('is_main')} DESC`);
  if (has(columns, 'is_primary')) orderParts.push(`${qid('is_primary')} DESC`);
  if (has(columns, 'sort_order')) orderParts.push(`${qid('sort_order')} ASC`);
  if (has(columns, 'position')) orderParts.push(`${qid('position')} ASC`);
  if (has(columns, 'id')) orderParts.push(`${qid('id')} ASC`);

  const [rows] = await productDb.query(
    `SELECT * FROM ${qid(PRODUCT_IMAGES_TABLE)} WHERE ${where.map((part) => `(${part})`).join(' OR ')} ${has(columns, 'deleted_at') ? `AND ${qid('deleted_at')} IS NULL` : ''} ORDER BY ${orderParts.length ? orderParts.join(', ') : '1'} LIMIT 1`,
    values,
  );

  return normalizeImageUrl(rows[0] || {}) || '';
}

async function enrichInventoryRow(row = {}) {
  const productId = firstValue(row, ['product_id']);
  const variantId = firstValue(row, ['variant_id']);
  const sku = clean(firstValue(row, ['sku', 'local_sku', 'product_sku', 'variant_sku']));
  const productRow = await findProductRowById(productId).catch(() => null);
  const merged = { ...(productRow || {}), ...row };
  const imageUrl = await findImage({ productId, variantId, sku }).catch(() => '') || normalizeImageUrl(merged);
  return normalizeProduct(merged, imageUrl);
}

async function findBySku(sku) {
  const value = clean(sku);
  if (!value) return null;
  const invColumns = await columnsFor(inventoryDb, INVENTORY_TABLE);
  if (!invColumns.length || !has(invColumns, 'sku')) return null;

  const [rows] = await inventoryDb.query(
    `SELECT * FROM ${qid(INVENTORY_TABLE)} WHERE ${qid('sku')} = ? LIMIT 1`,
    [value],
  );
  if (!rows[0]) return null;
  return enrichInventoryRow(rows[0]);
}

async function searchProducts(query = {}) {
  const search = clean(query.search || query.q || query.sku);
  const limit = Math.min(Math.max(toInt(query.limit, 15), 1), 30);
  if (!search) return [];

  const invColumns = await columnsFor(inventoryDb, INVENTORY_TABLE);
  if (!invColumns.length || !has(invColumns, 'sku')) return [];

  const possibleSearchColumns = [
    'sku', 'local_sku', 'product_sku', 'variant_sku', 'product_title', 'product_name', 'title', 'name', 'description'
  ].filter((column) => has(invColumns, column));

  const where = possibleSearchColumns.length
    ? possibleSearchColumns.map((column) => `${qid(column)} LIKE ?`).join(' OR ')
    : `${qid('sku')} LIKE ?`;
  const values = possibleSearchColumns.length
    ? possibleSearchColumns.map(() => `%${search}%`)
    : [`%${search}%`];

  const orderParts = [];
  orderParts.push(`CASE WHEN ${qid('sku')} = ? THEN 0 WHEN ${qid('sku')} LIKE ? THEN 1 ELSE 2 END`);
  values.push(search, `${search}%`);
  if (has(invColumns, 'updated_at')) orderParts.push(`${qid('updated_at')} DESC`);
  if (has(invColumns, 'id')) orderParts.push(`${qid('id')} DESC`);

  const [rows] = await inventoryDb.query(
    `SELECT * FROM ${qid(INVENTORY_TABLE)} WHERE ${where} ORDER BY ${orderParts.join(', ')} LIMIT ?`,
    [...values, limit],
  );

  const output = [];
  const seen = new Set();
  for (const row of rows) {
    const product = await enrichInventoryRow(row).catch(() => normalizeProduct(row));
    if (!product.sku || seen.has(product.sku)) continue;
    seen.add(product.sku);
    output.push(product);
  }
  return output;
}

module.exports = {
  findBySku,
  searchProducts,
};
