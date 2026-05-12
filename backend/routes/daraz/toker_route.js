const express = require("express");

const router = express.Router();

const {
    createAccessToken
} = require("../../controllers/daraz/auth/darazAuthController");

router.get(
    "/callback",
    createAccessToken
);

module.exports = router;