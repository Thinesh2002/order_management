const db = require("../../../db/db");

const TABLE = "daraz_accounts";

const COLUMNS = {
  accountCode: "account_code",
  lastSync: "last_sync_time",
};

exports.getAllAccounts = async ({ fields = ["*"], limit, offset } = {}) => {
  const safeFields = fields
    .map((f) => (f === "*" ? f : db.escapeId(f)))
    .join(", ");

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

  const syncDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(syncDate.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }

  const [result] = await db.query(
    `UPDATE ${TABLE} SET ${COLUMNS.lastSync} = ? WHERE ${COLUMNS.accountCode} = ?`,
    [syncDate, accountCode]
  );

  return result;
};

exports.updateAccountTokens = async (accountCode, tokenData) => {
  if (!accountCode) {
    throw new Error("accountCode is required");
  }

  const query = `
    UPDATE ${TABLE} 
    SET 
      access_token = ?, 
      refresh_token = ?,
      expires_in = ?,
      refresh_expires_in = ?,
      token_updated_at = NOW()
    WHERE ${COLUMNS.accountCode} = ?
  `;

  const values = [
    tokenData.access_token || null,
    tokenData.refresh_token || null,
    tokenData.expires_in || null,
    tokenData.refresh_expires_in || null,
    accountCode
  ];

  const [result] = await db.query(query, values);

  if (result.affectedRows === 0) {
    throw new Error(`No account found with code: ${accountCode}`);
  }

  return result;
};

exports.updateTokenCheckStatus = async (accountCode, statusData) => {
  if (!accountCode) {
    throw new Error("accountCode is required");
  }

  const query = `
    UPDATE ${TABLE}
    SET
      token_status = ?,
      token_message = ?,
      seller_name = ?,
      last_token_check_at = NOW()
    WHERE ${COLUMNS.accountCode} = ?
  `;

  const values = [
    statusData.token_status || "UNKNOWN",
    statusData.token_message || null,
    statusData.seller_name || null,
    accountCode
  ];

  const [result] = await db.query(query, values);

  if (result.affectedRows === 0) {
    throw new Error(`No account found with code: ${accountCode}`);
  }

  return result;
};

exports.getTokenStatuses = async () => {
  const query = `
    SELECT
      account_code,
      account_name,
      token_status,
      token_message,
      seller_name,
      last_token_check_at,
      token_updated_at
    FROM ${TABLE}
    ORDER BY account_name ASC
  `;

  const [rows] = await db.query(query);
  return rows;
};