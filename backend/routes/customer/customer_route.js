const express = require("express");
const router = express.Router();

const customerController = require("../../controllers/customer/customer_controller");

router.post("/create", customerController.createCustomer);
router.get("/", customerController.getCustomers);
router.get("/phone/:phone", customerController.getCustomerByPhone);
router.get("/search/:phone", customerController.searchCustomers);

module.exports = router;