const axios = require("axios");
const crypto = require("crypto");

const accountModel = require("../../models/daraz/account/daraz_account_model");
const orderModel = require("../../models/daraz/orders/orders_model");
const itemModel = require("../../models/daraz/orders/order_items_model");

const db = require("../../db/db");

const generateSignature = (apiPath, params, appSecret) => {

    const sortedKeys = Object.keys(params).sort();

    let signString = apiPath;

    for (let key of sortedKeys) {
        signString += key + params[key];
    }

    return crypto
        .createHmac("sha256", appSecret)
        .update(signString)
        .digest("hex")
        .toUpperCase();
};

const safeParse = (value) => {

    if (!value) return {};

    if (typeof value === "object") {
        return value;
    }

    try {

        return JSON.parse(value);

    } catch (err) {

        console.log("Invalid JSON:", value);

        return {};
    }
};

let isSyncRunning = false;
let isBackfillRunning = false;

const fetchOrderItems = async (
    account,
    orderId
) => {

    try {

        const itemsPath = "/order/items/get";

        const itemParams = {
            app_key: account.app_key,
            access_token: account.access_token,
            timestamp: Date.now().toString(),
            sign_method: "sha256",
            order_id: orderId
        };

        itemParams.sign = generateSignature(
            itemsPath,
            itemParams,
            account.app_secret
        );

        const itemResponse = await axios.get(
            `${account.api_base}${itemsPath}`,
            {
                params: itemParams,
                timeout: 20000
            }
        );

        return itemResponse.data?.data || [];

    } catch (error) {

        console.log(
            `ITEM FETCH FAILED ${orderId}`,
            error.message
        );

        return [];
    }
};

const processSingleOrder = async (
    order,
    account
) => {

    try {

        console.log(
            "INSERTING ORDER:",
            order.order_id
        );

        await orderModel.upsertOrder(
            order,
            account.account_code
        );

        const items = await fetchOrderItems(
            account,
            order.order_id
        );

        await itemModel.replaceOrderItems(
            order.order_id,
            items
        );

        console.log(
            `ORDER SYNCED ${order.order_id}`
        );

    } catch (error) {

        console.log("=================================");
        console.log("ORDER PROCESS FAILED");
        console.log("ORDER ID:", order.order_id);
        console.log("ERROR:", error.message);

        if (error.sqlMessage) {
            console.log("SQL:", error.sqlMessage);
        }

        if (error.response?.data) {
            console.log("API:", error.response.data);
        }

        console.log("FULL ERROR:", error);
        console.log("=================================");
    }
};

exports.syncOrders = async () => {

    if (isSyncRunning) {

        console.log("Sync already running");

        return;
    }

    isSyncRunning = true;

    try {

        console.log("ORDER SYNC STARTED");

        const accounts = await accountModel.getAllAccounts();

        for (let account of accounts) {

            try {

                console.log(
                    `ACCOUNT: ${account.account_name}`
                );

                const apiPath = "/orders/get";

                const lastSync = account.last_sync_time
                    ? new Date(account.last_sync_time)
                    : new Date(Date.now() - 10 * 60 * 1000);

                const now = new Date();

                let offset = 0;
                let hasMore = true;

                while (hasMore) {

                    try {

                        const params = {
                            app_key: account.app_key,
                            access_token: account.access_token,
                            timestamp: Date.now().toString(),
                            sign_method: "sha256",
                            created_after: lastSync.toISOString(),
                            created_before: now.toISOString(),
                            limit: "100",
                            offset: offset.toString()
                        };

                        params.sign = generateSignature(
                            apiPath,
                            params,
                            account.app_secret
                        );

                        console.log(
                            `FETCHING OFFSET ${offset}`
                        );

                        const response = await axios.get(
                            `${account.api_base}${apiPath}`,
                            {
                                params,
                                timeout: 20000
                            }
                        );

                        console.log(
                            "FULL API RESPONSE:",
                            JSON.stringify(response.data, null, 2)
                        );

                        const orders =
                            response.data?.data?.orders || [];

                        console.log(
                            `ORDERS FOUND ${orders.length}`
                        );

                        if (!orders.length) {
                            break;
                        }

                        for (let order of orders) {

                            await processSingleOrder(
                                order,
                                account
                            );
                        }

                        if (orders.length < 100) {

                            hasMore = false;

                        } else {

                            offset += 100;
                        }

                    } catch (pageError) {

                        console.log(
                            `PAGE FAILED OFFSET ${offset}`,
                            pageError.message
                        );

                        offset += 100;
                    }
                }

                await accountModel.updateLastSync(
                    account.account_code,
                    now
                );

                console.log(
                    `ACCOUNT COMPLETED ${account.account_name}`
                );

            } catch (accountError) {

                console.log(
                    `ACCOUNT FAILED ${account.account_name}`,
                    accountError.message
                );
            }
        }

        console.log("ORDER SYNC COMPLETED");

    } catch (err) {

        console.error(
            "SYNC ERROR:",
            err.message
        );

    } finally {

        isSyncRunning = false;
    }
};

exports.backfillOrders = async () => {

    if (isBackfillRunning) {

        console.log("Backfill already running");

        return;
    }

    isBackfillRunning = true;

    try {

        console.log("BACKFILL STARTED");

        const accounts = await accountModel.getAllAccounts();

        for (let account of accounts) {

            try {

                console.log(
                    `BACKFILL ACCOUNT ${account.account_name}`
                );

                const apiPath = "/orders/get";

                let startDate = new Date(
                    "2022-01-01T00:00:00Z"
                );

                const today = new Date();

                while (startDate < today) {

                    let endDate = new Date(startDate);

                    endDate.setMonth(
                        endDate.getMonth() + 1
                    );

                    console.log(
                        `RANGE ${startDate.toISOString()} → ${endDate.toISOString()}`
                    );

                    let offset = 0;
                    let hasMore = true;

                    while (hasMore) {

                        try {

                            const params = {
                                app_key: account.app_key,
                                access_token: account.access_token,
                                timestamp: Date.now().toString(),
                                sign_method: "sha256",
                                created_after: startDate.toISOString(),
                                created_before: endDate.toISOString(),
                                limit: "100",
                                offset: offset.toString()
                            };

                            params.sign = generateSignature(
                                apiPath,
                                params,
                                account.app_secret
                            );

                            console.log(
                                `BACKFILL OFFSET ${offset}`
                            );

                            const response = await axios.get(
                                `${account.api_base}${apiPath}`,
                                {
                                    params,
                                    timeout: 20000
                                }
                            );

                            console.log(
                                "FULL API RESPONSE:",
                                JSON.stringify(response.data, null, 2)
                            );

                            const orders =
                                response.data?.data?.orders || [];

                            console.log(
                                `ORDERS FOUND ${orders.length}`
                            );

                            if (!orders.length) {
                                break;
                            }

                            for (let order of orders) {

                                await processSingleOrder(
                                    order,
                                    account
                                );
                            }

                            if (orders.length < 100) {

                                hasMore = false;

                            } else {

                                offset += 100;
                            }

                        } catch (pageError) {

                            console.log(
                                `BACKFILL PAGE FAILED OFFSET ${offset}`,
                                pageError.message
                            );

                            offset += 100;
                        }
                    }

                    startDate = endDate;
                }

                await accountModel.updateLastSync(
                    account.account_code,
                    today
                );

                console.log(
                    `BACKFILL ACCOUNT COMPLETED ${account.account_name}`
                );

            } catch (accountError) {

                console.log(
                    `BACKFILL ACCOUNT FAILED ${account.account_name}`,
                    accountError.message
                );
            }
        }

        console.log("BACKFILL COMPLETED");

    } catch (err) {

        console.error(
            "BACKFILL ERROR:",
            err.message
        );

    } finally {

        isBackfillRunning = false;
    }
};

exports.getOrders = async (req, res) => {

    try {

        const [orders] = await db.query(`
            SELECT 
                o.*, 
                a.account_name
            FROM orders o
            JOIN daraz_accounts a
                ON o.account_code = a.account_code
            ORDER BY o.created_at_daraz DESC
        `);

        for (let order of orders) {

            const [items] = await db.query(
                `
                SELECT *
                FROM order_items
                WHERE order_id = ?
                `,
                [order.order_id]
            );

            order.products = items;

            order.statuses = [order.order_status];

            order.address_billing = safeParse(
                order.address_billing
            );

            order.address_shipping = safeParse(
                order.address_shipping
            );
        }

        const totalSales = orders.reduce(
            (sum, order) => {

                if (
                    order.order_status === "delivered"
                ) {
                    return (
                        sum + Number(order.price || 0)
                    );
                }

                return sum;
            },
            0
        );

        res.json({
            totalAccounts: new Set(
                orders.map(
                    o => o.account_code
                )
            ).size,

            totalOrders: orders.length,

            totalSales,

            orders
        });

    } catch (error) {

        console.error(
            "GET ORDERS ERROR:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
};