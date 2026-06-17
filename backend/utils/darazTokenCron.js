const cron = require("node-cron");
const {
    checkAndUpdateDarazTokens
} = require("../controllers/daraz/auth/darazAuthController");

let isRunning = false;

const startDarazTokenCron = () => {
    console.log("Daraz token cron started. Running every 30 minutes.");

    cron.schedule("*/30 * * * *", async () => {
        if (isRunning) {
            console.log("Daraz token cron skipped. Previous job still running.");
            return;
        }

        isRunning = true;

        try {
            console.log("Daraz token auto check started...");

            const result = await checkAndUpdateDarazTokens();

            console.log(
                `Daraz token auto check completed. Active: ${result.active_accounts}, Expired: ${result.expired_accounts}, Auth Required: ${result.auth_required_accounts}`
            );
        } catch (error) {
            console.log("Daraz token cron error:", error.message);
        } finally {
            isRunning = false;
        }
    });
};

module.exports = startDarazTokenCron;