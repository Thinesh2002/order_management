const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/daraz/daraz_order_controller");


router.get("/all", orderController.getOrders);


router.post("/backfill", async (req, res) => {
    try {
        await orderController.backfillOrders();
        res.json({ message: "Backfill completed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post("/sync", async (req, res) => {
    try {
        await orderController.syncOrders();
        res.json({ message: "Sync completed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
