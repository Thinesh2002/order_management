const express = require("express");
const router = express.Router();
const { fetchOrders } = require("../../controllers/woo_orders/woo_orders_controllers");

router.get("/orders", fetchOrders);

module.exports = router;