const db = require("../../../db/db");

exports.getAllAccounts = async () => {
    const [rows] = await db.query("SELECT * FROM daraz_accounts");
    return rows;
};

exports.updateLastSync = async (accountCode, date) => {
    await db.query(
        "UPDATE daraz_accounts SET last_sync_time = ? WHERE account_code = ?",
        [date, accountCode]
    );
};
