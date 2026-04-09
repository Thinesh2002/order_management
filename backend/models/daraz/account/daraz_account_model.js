const db = require("../../../db/db");

const TABLE = "daraz_accounts";

const COLUMNS = {
  accountCode: "account_code",
  lastSync: "last_sync_time",
};

exports.getAllAccounts = async ({ fields = ["*"], limit, offset } = {}) => {
  const safeFields = fields.map((f) => (f === "*" ? f : db.escapeId(f))).join(", ");

  let sql = `SELECT ${safeFields} FROM ${TABLE}`;
  const params = [];

  if (limit != null) {
    sql += " LIMIT ?";
    params.push(parseInt(limit, 10));
  }
  if (offset != null) {
    sql += " OFFSET ?";
    params.push(parseInt(offset, 10));
  }

  const [rows] = await db.query(sql, params);
  return rows;
};

exports.getAccountByCode = async (accountCode) => {
  if (!accountCode) {
    throw new Error("accountCode is required");
  }

  const [rows] = await db.query(
    `SELECT * FROM ${TABLE} WHERE ${COLUMNS.accountCode} = ? LIMIT 1`,
    [accountCode]
  );

  return rows[0] || null;
};

exports.updateLastSync = async (accountCode, date = new Date()) => {
  if (!accountCode) {
    throw new Error("accountCode is required");
  }

  if (!(date instanceof Date) && typeof date !== "string") {
    throw new Error("date must be a Date object or a valid date string");
  }

  const syncDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(syncDate.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }

  const [result] = await db.query(
    `UPDATE ${TABLE} SET ${COLUMNS.lastSync} = ? WHERE ${COLUMNS.accountCode} = ?`,
    [syncDate, accountCode]
  );

  if (result.affectedRows === 0) {
    throw new Error(`No account found with code: ${accountCode}`);
  }

  return result;
};