const express = require("express");
const router = express.Router();

const {
  manualCheckAPI,
} = require("../../controllers/transexpress/trans_active_test_controller");

router.get("/api-status", manualCheckAPI);

module.exports = router;