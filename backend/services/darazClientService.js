const axios = require('axios');
const crypto = require('crypto');
const { clean, safeJson } = require('../utils/dbUtils');
const { getCredentialRows } = require('./marketplaceAccountService');
const { writeDarazApiLog } = require('./logService');

function signDaraz(apiPath, params, secret) {
  const path = String(apiPath || '').startsWith('/') ? apiPath : `/${apiPath}`;
  const sorted = Object.keys(params)
    .filter((key) => key !== 'sign' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort();
  let source = path;
  for (const key of sorted) source += `${key}${params[key]}`;
  return crypto.createHmac('sha256', String(secret || '')).update(source, 'utf8').digest('hex').toUpperCase();
}

function normalizeCredential(row = {}) {
  return {
    app_key: clean(row.app_key || row.app_key_encrypted || row.appKey || row.client_id || row.clientId || process.env.DARAZ_APP_KEY),
    app_secret: clean(row.app_secret || row.app_secret_encrypted || row.appSecret || row.client_secret || row.clientSecret || process.env.DARAZ_APP_SECRET),
    access_token: clean(row.access_token || row.access_token_encrypted || row.accessToken || row.token || process.env.DARAZ_ACCESS_TOKEN),
    refresh_token: clean(row.refresh_token || row.refresh_token_encrypted || row.refreshToken),
  };
}

async function getDarazCredentials(accountOrId) {
  const accountId = typeof accountOrId === 'object' ? accountOrId.account_id : accountOrId;
  const rows = await getCredentialRows(accountId, ['daraz_oauth', 'daraz', 'oauth']);
  const cred = normalizeCredential(rows[0] || {});
  cred.app_key = cred.app_key || process.env.DARAZ_APP_KEY || '';
  cred.app_secret = cred.app_secret || process.env.DARAZ_APP_SECRET || '';
  cred.access_token = cred.access_token || process.env.DARAZ_ACCESS_TOKEN || '';
  return cred;
}

function darazErrorMessage(body) {
  const errSource = body?.error_response || body?.ErrorResponse || body?.result || body || {};
  return errSource.message || errSource.msg || errSource.error_message || errSource.error_msg || errSource.display_message || 'Daraz API error';
}

function hasTopLevelDarazError(body) {
  return Boolean(body?.error_response || body?.ErrorResponse || (body?.code && String(body.code) !== '0'));
}

async function callDaraz(account, apiPath, apiParams = {}, method = 'GET', options = {}) {
  const credentials = options.credentials || await getDarazCredentials(account.account_id);
  const baseUrl = clean(account.api_base_url || process.env.DARAZ_API_BASE_URL || 'https://api.daraz.lk/rest').replace(/\/+$/, '');

  if (!credentials.app_key || !credentials.app_secret || !credentials.access_token) {
    throw Object.assign(new Error(`Daraz credentials missing for ${account.account_name || account.account_code}`), {
      statusCode: 400,
      code: 'DARAZ_CREDENTIALS_MISSING',
    });
  }

  const params = {
    app_key: credentials.app_key,
    access_token: credentials.access_token,
    timestamp: Date.now(),
    sign_method: 'sha256',
    ...apiParams,
  };
  params.sign = signDaraz(apiPath, params, credentials.app_secret);

  const isPost = String(method).toUpperCase() === 'POST';
  const requestPayload = {
    method: isPost ? 'POST' : 'GET',
    url: `${baseUrl}${apiPath}`,
    params: isPost ? undefined : params,
    data: isPost ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    headers: isPost ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' } : undefined,
    timeout: Number(process.env.DARAZ_API_TIMEOUT_MS || 60000),
  };

  try {
    const response = await axios(requestPayload);
    const body = response.data;

    await writeDarazApiLog({
      account_id: account.account_id,
      account_code: account.account_code,
      account_name: account.account_name,
      api_path: apiPath,
      http_method: requestPayload.method,
      status_code: response.status,
      request_payload: { ...apiParams, access_token: '[hidden]' },
      response_payload: body,
      success: !hasTopLevelDarazError(body),
    }).catch(() => null);

    if (hasTopLevelDarazError(body)) {
      throw Object.assign(new Error(darazErrorMessage(body)), { statusCode: 502, daraz: body });
    }

    return body;
  } catch (error) {
    await writeDarazApiLog({
      account_id: account.account_id,
      account_code: account.account_code,
      account_name: account.account_name,
      api_path: apiPath,
      http_method: requestPayload.method,
      request_payload: { ...apiParams, access_token: '[hidden]' },
      response_payload: error.response?.data || error.daraz || null,
      error_message: error.message,
      success: false,
    }).catch(() => null);
    throw error;
  }
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_error) { return fallback; }
}

function findArrayWithKeys(input, keys = []) {
  const wanted = new Set(keys.map((key) => String(key).toLowerCase()));
  const queue = [input];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value) && value.some((item) => item && typeof item === 'object' && Object.keys(item).some((key) => wanted.has(String(key).toLowerCase())))) {
      return value;
    }
    const children = Array.isArray(value) ? value : Object.values(value);
    children.forEach((child) => { if (child && typeof child === 'object') queue.push(child); });
  }
  return [];
}

function valueFromKeys(obj = {}, keys = []) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function deepFindDocument(input) {
  const queue = [input];
  const seen = new Set();
  const fileKeys = ['file', 'document', 'file_base64', 'base64', 'content', 'pdf', 'pdf_file'];
  const urlKeys = ['pdf_url', 'file_url', 'url', 'download_url', 'document_url'];

  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);

    const hasFile = valueFromKeys(value, fileKeys);
    const hasUrl = valueFromKeys(value, urlKeys);
    const hasType = value.doc_type || value.document_type || value.mime_type || value.mimeType || value.type;
    if ((hasFile || hasUrl) && (hasType || hasUrl || hasFile)) return value;

    const children = Array.isArray(value) ? value : Object.values(value);
    children.forEach((child) => { if (child && typeof child === 'object') queue.push(child); });
  }
  return null;
}

function documentFromResponse(body, fallback = {}) {
  const found = deepFindDocument(body) || {};
  const file = valueFromKeys(found, ['file', 'document', 'file_base64', 'base64', 'content', 'pdf', 'pdf_file'])
    || valueFromKeys(body, ['file', 'document', 'file_base64', 'base64', 'content', 'pdf', 'pdf_file']);
  const pdfUrl = valueFromKeys(found, ['pdf_url', 'file_url', 'url', 'download_url', 'document_url'])
    || valueFromKeys(body, ['pdf_url', 'file_url', 'url', 'download_url', 'document_url']);
  const typeValue = found.doc_type || found.document_type || found.type || fallback.doc_type || fallback.document_type || 'shippingLabel';
  const mimeType = found.mime_type || found.mimeType || fallback.mime_type || (String(typeValue).toUpperCase() === 'PDF' ? 'application/pdf' : 'text/html');
  const documentType = found.document_type || found.doc_type || fallback.document_type || fallback.doc_type || 'shippingLabel';
  if (!file && !pdfUrl) return null;
  return {
    document_type: documentType,
    doc_type: found.doc_type || fallback.doc_type || documentType,
    mime_type: mimeType,
    file_base64: file,
    pdf_url: pdfUrl,
    raw_payload: body,
  };
}

module.exports = {
  callDaraz,
  documentFromResponse,
  findArrayWithKeys,
  getDarazCredentials,
  parseJson,
  signDaraz,
};
