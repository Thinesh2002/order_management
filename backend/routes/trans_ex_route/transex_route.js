const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getOrderItems
} = require("../../controllers/manual_order/order_controller");

const transexController = require("../../controllers/transexpress/transex_controller");

router.post("/create", createOrder);
router.get("/all", getOrders);
router.get("/items/:id", getOrderItems);

router.post("/track", transexController.trackOrder);

module.exports = router;