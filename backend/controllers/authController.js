const jwt = require('jsonwebtoken');
const authUserModel = require('../models/authUserModel');
const { jwtSecret } = require('../middlewares/authMiddleware');
const { cleanString, requestInfo, safeUser } = require('../utils/authHelpers');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      user_uid: user.user_uid,
      role: user.role,
    },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

async function login(req, res, next) {
  try {
    const loginIdentifier = cleanString(
      req.body.identifier || req.body.login_id || req.body.user_id || req.body.username || req.body.email
    );
    const password = String(req.body.password || '');
    const { ip, userAgent } = requestInfo(req);
    const maxAttempts = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5);
    const lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES || 15);

    if (!loginIdentifier || !password) {
      await authUserModel.writeLoginLog({
        loginIdentifier,
        action: 'login_failed',
        status: 'failed',
        failureReason: 'missing_credentials',
        message: 'User ID/email and password are required.',
        ip,
        userAgent,
      });
      return res.status(400).json({ success: false, message: 'User ID/email and password are required.' });
    }

    let user = await authUserModel.findByIdentifier(loginIdentifier);
    if (user) user = await authUserModel.unlockIfExpired(user);

    if (user && authUserModel.isLocked(user)) {
      await authUserModel.writeLoginLog({
        userId: user.id,
        loginUserId: user.user_uid,
        email: user.email,
        loginIdentifier,
        action: 'login_blocked',
        status: 'blocked',
        failureReason: 'account_temporarily_locked',
        message: `Login blocked. Account locked until ${user.locked_until}.`,
        ip,
        userAgent,
      });
      return res.status(423).json({
        success: false,
        message: `Too many failed attempts. Account locked for ${lockMinutes} minutes.`,
      });
    }

    const validPassword = user ? await authUserModel.verifyPassword(password, user.password) : false;

    if (!user || !validPassword) {
      const nextFailedAttempts = user ? Number(user.failed_login_attempts || 0) + 1 : 1;
      const shouldLock = Boolean(user && nextFailedAttempts >= maxAttempts);
      if (user) await authUserModel.registerFailedLogin(user.id, shouldLock, lockMinutes);

      await authUserModel.writeLoginLog({
        userId: user?.id || null,
        loginUserId: user?.user_uid || null,
        email: user?.email || (loginIdentifier.includes('@') ? loginIdentifier.toLowerCase() : null),
        loginIdentifier,
        action: shouldLock ? 'login_blocked' : 'login_failed',
        status: shouldLock ? 'blocked' : 'failed',
        failureReason: shouldLock ? 'max_failed_attempts_reached' : 'invalid_credentials',
        message: shouldLock
          ? `Account locked after ${nextFailedAttempts} failed attempts.`
          : `Failed login attempt for ${loginIdentifier}.`,
        ip,
        userAgent,
      });

      return res.status(401).json({ success: false, message: 'Invalid User ID/email or password.' });
    }

    if (user.status !== 'active') {
      await authUserModel.writeLoginLog({
        userId: user.id,
        loginUserId: user.user_uid,
        email: user.email,
        loginIdentifier,
        action: 'login_failed',
        status: 'failed',
        failureReason: 'inactive_account',
        message: 'Inactive account tried to login.',
        ip,
        userAgent,
      });
      return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact admin.' });
    }

    await authUserModel.markLoginSuccess(user.id, ip);
    const freshUser = await authUserModel.findById(user.id);
    const token = generateToken(freshUser);

    await authUserModel.writeLoginLog({
      userId: freshUser.id,
      loginUserId: freshUser.user_uid,
      email: freshUser.email,
      loginIdentifier,
      action: 'login_success',
      status: 'success',
      message: `${freshUser.user_uid} logged in successfully.`,
      ip,
      userAgent,
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser(freshUser),
      menu: [],
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res) {
  return res.json({ success: true, user: safeUser(req.user), menu: [] });
}

async function logout(req, res) {
  const { ip, userAgent } = requestInfo(req);

  await authUserModel.writeLoginLog({
    userId: req.user?.id,
    loginUserId: req.user?.user_uid,
    email: req.user?.email,
    loginIdentifier: req.user?.user_uid,
    action: 'logout',
    status: 'success',
    message: `${req.user?.user_uid || 'User'} logged out.`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: 'Logout successful.' });
}

module.exports = {
  login,
  me,
  logout,
};
