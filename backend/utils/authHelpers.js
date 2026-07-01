function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

function requestInfo(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')?.[0]?.trim() || req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    user_uid: user.user_uid,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    is_master_locked: user.is_master_locked,
    last_login_at: user.last_login_at,
  };
}

module.exports = {
  cleanString,
  cleanEmail,
  requestInfo,
  safeUser,
};
