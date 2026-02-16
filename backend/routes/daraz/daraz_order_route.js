const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/daraz/daraz_order_controller");

router.get("/all", orderController.getOrders);



module.exports = router;
