const bcrypt = require('bcrypt');
const { authDb } = require('../config/db');
const { cleanEmail, cleanString } = require('../utils/authHelpers');

const SAFE_FIELDS = `id, user_uid, name, email, role, status, is_master_locked,
  failed_login_attempts, locked_until, last_login_at, last_login_ip,
  password_changed_at, created_at, updated_at`;

async function findById(id, includePassword = false) {
  const fields = includePassword ? '*' : SAFE_FIELDS;
  const [rows] = await authDb.query(`SELECT ${fields} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findByIdentifier(identifier) {
  const value = cleanString(identifier);
  if (!value) return null;

  const [rows] = await authDb.query(
    `SELECT *
       FROM users
      WHERE email = ? OR user_uid = ? OR name = ?
      LIMIT 1`,
    [cleanEmail(value), value, value]
  );

  return rows[0] || null;
}

function isLocked(user) {
  if (!user?.locked_until) return false;
  const lockedUntil = new Date(user.locked_until);
  return !Number.isNaN(lockedUntil.getTime()) && lockedUntil > new Date();
}

async function unlockIfExpired(user) {
  if (!user?.locked_until) return user;

  const lockedUntil = new Date(user.locked_until);
  if (!Number.isNaN(lockedUntil.getTime()) && lockedUntil <= new Date()) {
    await authDb.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
      [user.id]
    );
    return findById(user.id, true);
  }

  return user;
}

async function verifyPassword(inputPassword, storedPassword) {
  const input = String(inputPassword || '');
  const stored = String(storedPassword || '');
  if (!input || !stored) return false;

  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    return bcrypt.compare(input, stored);
  }

  // Backward compatibility only: some old testing users may have plain passwords.
  return input === stored;
}

async function registerFailedLogin(userId, shouldLock, lockMinutes) {
  if (!userId) return;

  if (shouldLock) {
    await authDb.query(
      `UPDATE users
          SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
              locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)
        WHERE id = ?`,
      [lockMinutes, userId]
    );
    return;
  }

  await authDb.query(
    `UPDATE users
        SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
      WHERE id = ?`,
    [userId]
  );
}

async function markLoginSuccess(userId, ip) {
  await authDb.query(
    `UPDATE users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = NOW(),
            last_login_ip = ?
      WHERE id = ?`,
    [ip, userId]
  );
}

async function writeLoginLog(payload) {
  try {
    await authDb.query(
      `INSERT INTO login_logs
        (user_id, login_user_id, email, login_identifier, action, status, failure_reason, message, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        payload.userId || null,
        payload.loginUserId || null,
        payload.email || null,
        payload.loginIdentifier || null,
        payload.action || null,
        payload.status || null,
        payload.failureReason || null,
        payload.message || null,
        payload.ip || null,
        payload.userAgent || null,
      ]
    );
  } catch (error) {
    // Login should not fail because logging table/columns are missing in old databases.
    console.warn('[LOGIN_LOG_SKIP]', error.message);
  }
}

module.exports = {
  findById,
  findByIdentifier,
  isLocked,
  unlockIfExpired,
  verifyPassword,
  registerFailedLogin,
  markLoginSuccess,
  writeLoginLog,
};
