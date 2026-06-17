const express = require("express");
const router = express.Router();

const {
    createAccessToken,
    checkDarazTokens,
    getDarazTokenStatuses
} = require("../../controllers/daraz/auth/darazAuthController");

router.get("/auth/callback", createAccessToken);

// Manual check + refresh + DB status update
router.get("/check", checkDarazTokens);

// Only show saved status from DB
router.get("/status", getDarazTokenStatuses);

module.exports = router;