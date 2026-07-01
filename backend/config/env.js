require('dotenv').config();

function getEnv(key, fallback = '') {
  return process.env[key] !== undefined ? process.env[key] : fallback;
}

function getNumberEnv(key, fallback) {
  const numberValue = Number(process.env[key]);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getBooleanEnv(key, fallback = false) {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

module.exports = {
  getEnv,
  getNumberEnv,
  getBooleanEnv,
};
