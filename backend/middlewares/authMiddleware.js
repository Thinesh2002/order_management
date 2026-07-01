const jwt = require('jsonwebtoken');
const authUserModel = require('../models/authUserModel');

function jwtSecret() {
  return process.env.JWT_SECRET || 'change_this_secret_key';
}

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Please login first.' });
    }

    const decoded = jwt.verify(token, jwtSecret());
    const user = await authUserModel.findById(decoded.id || decoded.user_id);

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Your account is inactive or not found.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Login expired. Please login again.' });
  }
}

module.exports = {
  protect,
  jwtSecret,
};
