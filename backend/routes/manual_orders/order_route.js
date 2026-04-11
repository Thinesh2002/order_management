const express = require("express");
const router = express.Router();

const orderController = require("../../controllers/manual_order/order_controller");

router.post("/create", orderController.createOrder);
router.get("/all", orderController.getOrders);
router.get("/items/:id", orderController.getOrderItems);
router.get("/next-id", orderController.getNextOrderId);
router.put("/update/:id", orderController.updateOrder);

module.exports = router;