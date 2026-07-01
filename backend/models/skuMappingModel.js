const { marketplaceDb } = require('../config/db');
const { tableExists } = require('../utils/dbUtils');

async function findLocalSku(platform, accountId, marketplaceSku) {
  const exists = await tableExists(marketplaceDb, 'marketplace_sku_mappings').catch(() => false);
  if (!exists || !marketplaceSku) return null;

  const [rows] = await marketplaceDb.query(
    `SELECT local_sku
     FROM marketplace_sku_mappings
     WHERE platform = ? AND (account_id = ? OR account_id IS NULL) AND marketplace_sku = ?
     ORDER BY account_id IS NULL ASC, id DESC
     LIMIT 1`,
    [platform, accountId || null, marketplaceSku],
  );
  return rows[0]?.local_sku || null;
}

module.exports = { findLocalSku };
