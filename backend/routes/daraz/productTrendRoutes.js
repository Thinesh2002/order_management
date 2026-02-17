const express = require("express");
const router = express.Router();
const controller = require("../../controllers/daraz/product_moving_trend/product_moving_trend_controller");

router.get("/product-moving-trend", controller.getProductMovingTrend);

module.exports = router;
