function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

async function tableExists(db, tableName) {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
}

async function getColumns(db, tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(tableName)}`);
  return rows.map((row) => row.Field);
}

function pickExistingColumns(columns, payload) {
  const columnSet = new Set(columns);
  const keys = Object.keys(payload).filter((key) => columnSet.has(key) && payload[key] !== undefined);
  return {
    keys,
    values: keys.map((key) => payload[key]),
  };
}

async function safeInsert(db, tableName, payload) {
  const exists = await tableExists(db, tableName).catch(() => false);
  if (!exists) return null;
  const columns = await getColumns(db, tableName);
  const { keys, values } = pickExistingColumns(columns, payload);
  if (!keys.length) return null;
  const [result] = await db.query(
    `INSERT INTO ${qid(tableName)} (${keys.map(qid).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    values,
  );
  return result.insertId;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clean(value) {
  return String(value ?? '').trim();
}

function safeJson(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseMaybeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_error) { return fallback; }
}

function isoDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  qid,
  tableExists,
  getColumns,
  pickExistingColumns,
  safeInsert,
  toNumber,
  toInt,
  clean,
  safeJson,
  parseMaybeJson,
  isoDateOrNull,
};
