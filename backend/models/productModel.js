const { productDb } = require('../config/db');
const { qid, tableExists, getColumns } = require('../utils/dbUtils');

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || process.env.PM_PRODUCTS_TABLE || 'products';
const PRODUCT_IMAGES_TABLE = process.env.PRODUCT_IMAGES_TABLE || 'product_images';

async function findProductById(productId) {
  const exists = await tableExists(productDb, PRODUCTS_TABLE).catch(() => false);
  if (!exists) return null;
  const columns = await getColumns(productDb, PRODUCTS_TABLE);
  const pk = columns.includes('id') ? 'id' : columns[0];
  const [rows] = await productDb.query(`SELECT * FROM ${qid(PRODUCTS_TABLE)} WHERE ${qid(pk)} = ? LIMIT 1`, [productId]);
  return rows[0] || null;
}

async function listProductImages(productId) {
  const exists = await tableExists(productDb, PRODUCT_IMAGES_TABLE).catch(() => false);
  if (!exists) return [];
  const columns = await getColumns(productDb, PRODUCT_IMAGES_TABLE);
  const productIdColumn = columns.includes('product_id') ? 'product_id' : 'id';
  const [rows] = await productDb.query(`SELECT * FROM ${qid(PRODUCT_IMAGES_TABLE)} WHERE ${qid(productIdColumn)} = ?`, [productId]);
  return rows;
}

module.exports = {
  findProductById,
  listProductImages,
};
