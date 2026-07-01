const { marketplaceDb } = require('../config/db');
const { clean, tableExists } = require('../utils/dbUtils');

async function resolveLocalSku({ platform, account_id, account_code, marketplace_sku, fallback_sku }) {
  const marketplaceSku = clean(marketplace_sku || fallback_sku);
  if (!marketplaceSku) return clean(fallback_sku);

  const exists = await tableExists(marketplaceDb, 'marketplace_sku_mappings').catch(() => false);
  if (!exists) return clean(fallback_sku || marketplaceSku);

  const values = [String(platform || '').toUpperCase(), marketplaceSku];
  const where = ['UPPER(platform) = ?', 'marketplace_sku = ?'];

  if (account_id) {
    where.push('(account_id = ? OR account_id IS NULL)');
    values.push(account_id);
  } else if (account_code) {
    where.push('(account_code = ? OR account_code IS NULL OR account_code = \'\')');
    values.push(account_code);
  }

  const [rows] = await marketplaceDb.query(
    `SELECT local_sku FROM marketplace_sku_mappings WHERE ${where.join(' AND ')} ORDER BY account_id DESC, id DESC LIMIT 1`,
    values,
  );

  return clean(rows[0]?.local_sku || fallback_sku || marketplaceSku);
}

module.exports = { resolveLocalSku };
