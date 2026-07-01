const { marketplaceDb } = require('../config/db');
const { qid, tableExists } = require('../utils/dbUtils');

async function getMarketplaceTable(tableName) {
  const exists = await tableExists(marketplaceDb, tableName).catch(() => false);
  return exists ? tableName : null;
}

async function findAccountById(tableName, idColumn, accountId) {
  const table = await getMarketplaceTable(tableName);
  if (!table) return null;
  const [rows] = await marketplaceDb.query(
    `SELECT * FROM ${qid(table)} WHERE ${qid(idColumn)} = ? LIMIT 1`,
    [accountId],
  );
  return rows[0] || null;
}

async function listAccounts(tableName, orderColumn = 'id') {
  const table = await getMarketplaceTable(tableName);
  if (!table) return [];
  const [rows] = await marketplaceDb.query(`SELECT * FROM ${qid(table)} ORDER BY ${qid(orderColumn)} DESC`);
  return rows;
}

module.exports = {
  getMarketplaceTable,
  findAccountById,
  listAccounts,
};
