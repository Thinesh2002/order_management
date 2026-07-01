const { orderDb, marketplaceDb } = require('../config/db');
const { clean, parseMaybeJson } = require('../utils/dbUtils');

const tableCache = new Map();
const columnCache = new Map();

function qid(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function normalizePlatform(value = '') {
  const raw = clean(value).toLowerCase();
  if (!raw) return 'OTHER';
  if (raw === 'daraz' || raw.includes('daraz') || raw.includes('lazada')) return 'DARAZ';
  if (raw === 'woo' || raw.includes('woo') || raw.includes('woocommerce') || raw.includes('word press') || raw.includes('wordpress')) return 'WOO';
  return raw.toUpperCase();
}

async function tableExists(tableName) {
  if (tableCache.has(tableName)) return tableCache.get(tableName);
  try {
    const [rows] = await marketplaceDb.query('SHOW TABLES LIKE ?', [tableName]);
    const exists = rows.length > 0;
    tableCache.set(tableName, exists);
    return exists;
  } catch (_) {
    tableCache.set(tableName, false);
    return false;
  }
}

async function getColumns(tableName) {
  if (columnCache.has(tableName)) return columnCache.get(tableName);
  try {
    const [rows] = await marketplaceDb.query(`SHOW COLUMNS FROM ${qid(tableName)}`);
    const cols = new Set(rows.map((row) => row.Field));
    columnCache.set(tableName, cols);
    return cols;
  } catch (_) {
    const empty = new Set();
    columnCache.set(tableName, empty);
    return empty;
  }
}

function has(cols, column) {
  return cols && cols.has(column);
}

function firstValue(row = {}, keys = [], fallback = null) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return fallback;
}

function collectJsonObjects(row = {}) {
  const objects = [];
  const jsonFields = [
    'credentials', 'credential', 'credential_json', 'credentials_json', 'auth_json', 'token_json', 'token_data', 'oauth_data',
    'config', 'settings', 'api_config', 'api_settings', 'meta', 'metadata', 'extra_data', 'extra', 'raw_payload', 'payload', 'data',
  ];
  for (const field of jsonFields) {
    const value = row[field];
    const parsed = parseMaybeJson(value, null);
    if (parsed && typeof parsed === 'object') objects.push(parsed);
  }
  return objects;
}

function deepFindValue(input, keys = [], maxDepth = 5) {
  const wanted = new Set(keys.map((key) => String(key).toLowerCase()));
  const queue = [{ value: input, depth: 0 }];
  const seen = new Set();

  while (queue.length) {
    const { value, depth } = queue.shift();
    if (!value || typeof value !== 'object') continue;
    if (seen.has(value)) continue;
    seen.add(value);

    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(String(key).toLowerCase()) && child !== undefined && child !== null && child !== '') {
        return child;
      }
    }

    if (depth >= maxDepth) continue;
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 });
    }
  }

  return null;
}

function enrichCredentialRow(row = {}) {
  const jsonObjects = collectJsonObjects(row);
  const get = (aliases, fallback = null) => {
    const direct = firstValue(row, aliases, null);
    if (direct !== null && direct !== undefined && direct !== '') return direct;
    for (const obj of jsonObjects) {
      const found = deepFindValue(obj, aliases);
      if (found !== null && found !== undefined && found !== '') return found;
    }
    return fallback;
  };

  return {
    ...row,
    app_key: get(['app_key', 'appKey', 'client_id', 'clientId', 'key'], row.app_key),
    app_secret: get(['app_secret', 'appSecret', 'client_secret', 'clientSecret', 'secret'], row.app_secret),
    access_token: get(['access_token', 'accessToken', 'token', 'seller_access_token'], row.access_token),
    refresh_token: get(['refresh_token', 'refreshToken'], row.refresh_token),
    consumer_key: get(['consumer_key', 'consumerKey', 'ck', 'woo_consumer_key'], row.consumer_key),
    consumer_secret: get(['consumer_secret', 'consumerSecret', 'cs', 'woo_consumer_secret'], row.consumer_secret),
    store_url: get(['store_url', 'site_url', 'website_url', 'woocommerce_url', 'woo_url', 'base_url', 'url'], row.store_url),
  };
}

async function findAccountTable() {
  const candidates = ['accounts', 'marketplace_accounts'];
  for (const tableName of candidates) {
    if (await tableExists(tableName)) return tableName;
  }
  return null;
}

async function readHealthByAccountIds(accountIds = []) {
  const ids = accountIds.filter(Boolean);
  if (!ids.length || !(await tableExists('account_health'))) return new Map();

  const cols = await getColumns('account_health');
  if (!has(cols, 'account_id')) return new Map();

  const [rows] = await marketplaceDb.query(
    `SELECT * FROM ${qid('account_health')} WHERE account_id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );

  const map = new Map();
  for (const row of rows) map.set(String(row.account_id), row);
  return map;
}

async function listMarketplaceAccounts({ platform = 'all', activeOnly = false } = {}) {
  const tableName = await findAccountTable();
  if (!tableName) return [];

  const accountCols = await getColumns(tableName);
  const platformExists = await tableExists('platforms');
  const platformCols = platformExists ? await getColumns('platforms') : new Set();
  const canJoinPlatform = platformExists && has(accountCols, 'platform_id') && has(platformCols, 'id');

  const platformSelect = canJoinPlatform
    ? ', p.platform_code AS joined_platform_code, p.platform_name AS joined_platform_name'
    : ', NULL AS joined_platform_code, NULL AS joined_platform_name';
  const platformJoin = canJoinPlatform ? `LEFT JOIN ${qid('platforms')} p ON p.id = a.platform_id` : '';

  const where = [];
  if (activeOnly && has(accountCols, 'status')) {
    where.push("LOWER(COALESCE(a.status, 'active')) NOT IN ('deleted','inactive','disabled','paused','archived')");
  }
  if (activeOnly && has(accountCols, 'connection_status')) {
    where.push("LOWER(COALESCE(a.connection_status, 'connected')) NOT IN ('paused','deleted','disabled')");
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const orderBy = has(accountCols, 'id') ? 'ORDER BY a.id ASC' : '';
  const [rows] = await marketplaceDb.query(
    `SELECT a.* ${platformSelect}
     FROM ${qid(tableName)} a
     ${platformJoin}
     ${whereSql}
     ${orderBy}`,
  );

  const healthMap = await readHealthByAccountIds(rows.map((row) => row.id || row.account_id));
  const requestedPlatform = normalizePlatform(platform);

  return rows
    .map((row) => {
      const accountId = firstValue(row, ['id', 'account_id', 'marketplace_account_id']);
      const health = healthMap.get(String(accountId)) || {};
      const rawPlatform = firstValue(row, [
        'joined_platform_code', 'platform_code', 'platform', 'marketplace', 'marketplace_code', 'channel', 'account_type',
        'joined_platform_name', 'platform_name', 'marketplace_name', 'account_code', 'account_name',
      ], 'OTHER');
      const platformCode = normalizePlatform(rawPlatform);
      return {
        account_id: accountId,
        account_uid: firstValue(row, ['account_uid', 'uid', 'account_uuid']),
        account_code: firstValue(row, ['account_code', 'code', 'store_code'], null),
        account_name: firstValue(row, ['account_name', 'name', 'store_name'], `Account ${accountId || ''}`),
        store_url: firstValue(row, ['store_url', 'site_url', 'website_url', 'woocommerce_url', 'api_base_url'], null),
        api_base_url: firstValue(row, ['api_base_url', 'base_url', 'endpoint_url'], null),
        country_code: firstValue(row, ['country_code', 'country'], null),
        platform_code: platformCode,
        platform_name: firstValue(row, ['joined_platform_name', 'platform_name', 'marketplace_name'], platformCode),
        status: firstValue(row, ['status', 'account_status'], 'active'),
        connection_status: firstValue(health, ['connection_status'], firstValue(row, ['connection_status'], 'unknown')),
        token_status: firstValue(health, ['token_status'], 'unknown'),
        last_sync_at: firstValue(health, ['last_order_sync_at', 'last_product_sync_at', 'last_inventory_sync_at', 'last_checked_at'], firstValue(row, ['last_order_sync_at', 'last_sync_at', 'updated_at'], null)),
        last_checked_at: firstValue(health, ['last_checked_at'], null),
        error_count_today: Number(firstValue(health, ['error_count_today'], 0) || 0),
        success_count_today: Number(firstValue(health, ['success_count_today'], 0) || 0),
        last_error: firstValue(health, ['last_error', 'error_message'], firstValue(row, ['last_error', 'error_message'], null)),
      };
    })
    .filter((row) => {
      if (!platform || clean(platform).toLowerCase() === 'all') return true;
      return row.platform_code === requestedPlatform;
    });
}

async function getMarketplaceAccountById(accountId) {
  const all = await listMarketplaceAccounts({ platform: 'all', activeOnly: false });
  return all.find((account) => String(account.account_id) === String(accountId)) || null;
}

async function queryCredentialTable(tableName, accountId, credentialTypes = []) {
  if (!(await tableExists(tableName))) return [];
  const cols = await getColumns(tableName);
  const accountColumn = ['account_id', 'marketplace_account_id', 'accountId'].find((col) => has(cols, col));
  if (!accountColumn) return [];

  const typeColumn = ['credential_type', 'type', 'platform_code', 'platform'].find((col) => has(cols, col));
  const orderColumn = has(cols, 'updated_at') ? 'updated_at' : (has(cols, 'id') ? 'id' : accountColumn);
  const params = [accountId];
  let typeSql = '';

  if (typeColumn && credentialTypes.length) {
    typeSql = ` AND LOWER(${qid(typeColumn)}) IN (${credentialTypes.map(() => '?').join(',')})`;
    params.push(...credentialTypes.map((type) => String(type).toLowerCase()));
  }

  const [rows] = await marketplaceDb.query(
    `SELECT * FROM ${qid(tableName)} WHERE ${qid(accountColumn)} = ?${typeSql} ORDER BY ${qid(orderColumn)} DESC`,
    params,
  );
  if (rows.length) return rows.map(enrichCredentialRow);

  if (typeSql) {
    const [fallbackRows] = await marketplaceDb.query(
      `SELECT * FROM ${qid(tableName)} WHERE ${qid(accountColumn)} = ? ORDER BY ${qid(orderColumn)} DESC`,
      [accountId],
    );
    return fallbackRows.map(enrichCredentialRow);
  }

  return [];
}

async function getCredentialRows(accountId, credentialTypes = []) {
  if (!accountId) return [];
  const normalizedTypes = credentialTypes.map((type) => String(type).toLowerCase());
  const tables = [
    'account_credentials',
    'marketplace_credentials',
    'credentials',
    'account_tokens',
    'marketplace_tokens',
    'daraz_tokens',
    'daraz_credentials',
    'woo_credentials',
    'woocommerce_credentials',
  ];

  for (const tableName of tables) {
    const rows = await queryCredentialTable(tableName, accountId, normalizedTypes).catch(() => []);
    if (rows.length) return rows;
  }

  const accountTable = await findAccountTable();
  if (accountTable) {
    const cols = await getColumns(accountTable);
    const idColumn = has(cols, 'id') ? 'id' : (has(cols, 'account_id') ? 'account_id' : null);
    if (idColumn) {
      const [rows] = await marketplaceDb.query(`SELECT * FROM ${qid(accountTable)} WHERE ${qid(idColumn)} = ? LIMIT 1`, [accountId]).catch(() => [[]]);
      if (rows.length) return rows.map(enrichCredentialRow);
    }
  }

  return [];
}

function hasDarazCredentials(rows = []) {
  const row = enrichCredentialRow(rows[0] || {});
  return Boolean(row.app_key && row.app_secret && row.access_token);
}

function hasWooCredentials(rows = [], account = {}) {
  const row = enrichCredentialRow(rows[0] || {});
  return Boolean((row.store_url || account.store_url || account.api_base_url) && row.consumer_key && row.consumer_secret);
}

async function accountStatusSummary() {
  const accounts = await listMarketplaceAccounts({ platform: 'all', activeOnly: false });
  const enriched = [];

  for (const account of accounts) {
    const types = account.platform_code === 'DARAZ'
      ? ['daraz_oauth', 'daraz', 'oauth']
      : account.platform_code === 'WOO'
        ? ['woocommerce_keys', 'woocommerce', 'woo']
        : [];
    const credentials = await getCredentialRows(account.account_id, types).catch(() => []);
    const credentialReady = account.platform_code === 'DARAZ'
      ? hasDarazCredentials(credentials)
      : account.platform_code === 'WOO'
        ? hasWooCredentials(credentials, account)
        : false;

    enriched.push({
      ...account,
      credential_status: credentialReady ? 'ready' : 'missing',
      credential_ready: credentialReady,
    });
  }

  return {
    total_accounts: enriched.length,
    daraz_accounts: enriched.filter((row) => row.platform_code === 'DARAZ').length,
    woo_accounts: enriched.filter((row) => row.platform_code === 'WOO').length,
    ready_accounts: enriched.filter((row) => row.credential_ready).length,
    missing_credentials: enriched.filter((row) => ['DARAZ', 'WOO'].includes(row.platform_code) && !row.credential_ready).length,
    accounts: enriched,
  };
}

async function updateAccountOrderSync(accountId, success, message = null) {
  if (!accountId) return;
  const accountTable = await findAccountTable();

  if (accountTable) {
    const cols = await getColumns(accountTable);
    const idColumn = has(cols, 'id') ? 'id' : (has(cols, 'account_id') ? 'account_id' : null);
    const updates = [];
    const params = [];

    if (has(cols, 'last_sync_at')) updates.push('last_sync_at = NOW()');
    if (has(cols, 'last_order_sync_at')) updates.push('last_order_sync_at = NOW()');
    if (has(cols, 'last_error')) {
      updates.push('last_error = ?');
      params.push(success ? null : message);
    }
    if (has(cols, 'connection_status')) {
      updates.push('connection_status = ?');
      params.push(success ? 'connected' : 'error');
    }
    if (has(cols, 'updated_at')) updates.push('updated_at = NOW()');

    if (idColumn && updates.length) {
      params.push(accountId);
      await marketplaceDb.query(`UPDATE ${qid(accountTable)} SET ${updates.join(', ')} WHERE ${qid(idColumn)} = ?`, params).catch(() => null);
    }
  }

  if (await tableExists('account_health')) {
    const cols = await getColumns('account_health');
    if (has(cols, 'account_id')) {
      const fields = {
        account_id: accountId,
        platform_code: null,
        connection_status: success ? 'connected' : 'error',
        token_status: success ? 'valid' : 'unknown',
        last_error: success ? null : message,
        last_order_sync_at: success ? new Date() : null,
        last_checked_at: new Date(),
        success_count_today: success ? 1 : 0,
        error_count_today: success ? 0 : 1,
      };
      const insertKeys = Object.keys(fields).filter((key) => has(cols, key) && fields[key] !== undefined);
      if (insertKeys.length) {
        const updateKeys = insertKeys.filter((key) => key !== 'account_id');
        const values = insertKeys.map((key) => fields[key]);
        await marketplaceDb.query(
          `INSERT INTO ${qid('account_health')} (${insertKeys.map(qid).join(', ')}) VALUES (${insertKeys.map(() => '?').join(', ')})
           ON DUPLICATE KEY UPDATE ${updateKeys.map((key) => `${qid(key)} = VALUES(${qid(key)})`).join(', ')}`,
          values,
        ).catch(() => null);
      }
    }
  }
}


async function accountSchemaDiagnostics() {
  const [tableRows] = await marketplaceDb.query('SHOW TABLES').catch(() => [[]]);
  const tables = tableRows.map((row) => Object.values(row)[0]);
  const accountTable = await findAccountTable();
  const credentialTables = [];
  for (const tableName of ['account_credentials', 'marketplace_credentials', 'credentials', 'account_tokens', 'marketplace_tokens', 'daraz_tokens', 'daraz_credentials', 'woo_credentials', 'woocommerce_credentials']) {
    if (await tableExists(tableName)) credentialTables.push(tableName);
  }
  const accounts = await accountStatusSummary().catch((error) => ({ error: error.message }));
  return { database: process.env.MP_DB_NAME || process.env.MARKETPLACE_DB_NAME || 'cm_marketplace_management', tables, account_table: accountTable, credential_tables: credentialTables, accounts };
}

async function dropdownValues() {
  const accounts = await listMarketplaceAccounts({ platform: 'all', activeOnly: false });
  const [countries] = await orderDb.query(
    `SELECT DISTINCT shipping_country AS value FROM customers WHERE shipping_country IS NOT NULL AND shipping_country != '' ORDER BY shipping_country`,
  ).catch(() => [[]]);
  const [cities] = await orderDb.query(
    `SELECT DISTINCT shipping_city AS value FROM customers WHERE shipping_city IS NOT NULL AND shipping_city != '' ORDER BY shipping_city`,
  ).catch(() => [[]]);
  const [couriers] = await orderDb.query(
    `SELECT DISTINCT courier_status AS value FROM trans_express_waybills WHERE courier_status IS NOT NULL AND courier_status != '' ORDER BY courier_status`,
  ).catch(() => [[]]);
  const [payments] = await orderDb.query(
    `SELECT DISTINCT payment_method AS value FROM orders WHERE payment_method IS NOT NULL AND payment_method != ''
     UNION SELECT DISTINCT payment_method AS value FROM daraz_orders WHERE payment_method IS NOT NULL AND payment_method != ''
     UNION SELECT DISTINCT payment_method AS value FROM woo_orders WHERE payment_method IS NOT NULL AND payment_method != ''`,
  ).catch(() => [[]]);

  return {
    platforms: [...new Set(accounts.map((account) => account.platform_code).filter(Boolean))].map((value) => ({ value, label: value })),
    accounts: accounts.map((account) => ({
      value: String(account.account_id),
      label: account.account_name,
      account_id: account.account_id,
      account_code: account.account_code,
      platform_code: account.platform_code,
    })),
    countries,
    cities,
    couriers,
    payments,
  };
}

module.exports = {
  normalizePlatform,
  tableExists,
  getColumns,
  listMarketplaceAccounts,
  getMarketplaceAccountById,
  getCredentialRows,
  accountStatusSummary,
  updateAccountOrderSync,
  dropdownValues,
  accountSchemaDiagnostics,
};
