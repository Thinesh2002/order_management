const cron = require("node-cron");
const db = require("../db/db");
const { fetchOrders } = require("../services/daraz_service");

cron.schedule("*/5 * * * *", async () => {
  console.log("🔄 Syncing Daraz Orders...");

  const [accounts] = await db.query(
    "SELECT * FROM daraz_accounts"
  );

  for (let account of accounts) {
    await fetchOrders(account);
  }

  console.log("Sync Completed");
});
