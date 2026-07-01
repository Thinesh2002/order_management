const express = require('express');
const { login, me, logout } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Backward-compatible routes for old frontend builds that call /api/user/login.
router.post('/login', login);
router.get('/me', protect, me);
router.post('/logout', protect, logout);

module.exports = router;
