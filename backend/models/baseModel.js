const { qid, pickExistingColumns, getColumns, tableExists } = require('../utils/dbUtils');

async function findById(db, tableName, id, idColumn = 'id') {
  const exists = await tableExists(db, tableName).catch(() => false);
  if (!exists) return null;
  const [rows] = await db.query(
    `SELECT * FROM ${qid(tableName)} WHERE ${qid(idColumn)} = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findOne(db, tableName, where = {}, options = {}) {
  const exists = await tableExists(db, tableName).catch(() => false);
  if (!exists) return null;

  const keys = Object.keys(where).filter((key) => where[key] !== undefined);
  const sqlWhere = keys.length ? `WHERE ${keys.map((key) => `${qid(key)} = ?`).join(' AND ')}` : '';
  const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : '';
  const [rows] = await db.query(
    `SELECT * FROM ${qid(tableName)} ${sqlWhere} ${orderBy} LIMIT 1`,
    keys.map((key) => where[key]),
  );
  return rows[0] || null;
}

async function insert(db, tableName, payload = {}) {
  const columns = await getColumns(db, tableName);
  const { keys, values } = pickExistingColumns(columns, payload);
  if (!keys.length) return null;

  const [result] = await db.query(
    `INSERT INTO ${qid(tableName)} (${keys.map(qid).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    values,
  );
  return result.insertId;
}

async function updateById(db, tableName, id, payload = {}, idColumn = 'id') {
  const columns = await getColumns(db, tableName);
  const { keys, values } = pickExistingColumns(columns, payload);
  if (!keys.length) return 0;

  const [result] = await db.query(
    `UPDATE ${qid(tableName)} SET ${keys.map((key) => `${qid(key)} = ?`).join(', ')} WHERE ${qid(idColumn)} = ?`,
    [...values, id],
  );
  return result.affectedRows || 0;
}

async function deleteById(db, tableName, id, idColumn = 'id') {
  const [result] = await db.query(
    `DELETE FROM ${qid(tableName)} WHERE ${qid(idColumn)} = ?`,
    [id],
  );
  return result.affectedRows || 0;
}

module.exports = {
  findById,
  findOne,
  insert,
  updateById,
  deleteById,
};
