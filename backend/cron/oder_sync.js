const cron = require("node-cron");
const { syncOrders } = require("../controllers/daraz/daraz_order_controller");

let isRunning = false;

console.log("Order Sync Cron Initialized");

cron.schedule("*/10 * * * *", async () => {
  if (isRunning) {
    console.log("Sync already running... skipping");
    return;
  }

  isRunning = true;
  console.log("Starting Order Sync:", new Date().toISOString());

  try {
    await syncOrders();
    console.log("Order Sync Completed");
  } catch (err) {
    console.error("Order Sync Failed:", err.message);
  }

  isRunning = false;
});
