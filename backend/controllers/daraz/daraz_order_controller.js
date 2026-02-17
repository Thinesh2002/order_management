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

exports.syncOrders = async () => {

    const accounts = await accountModel.getAllAccounts();

    for (let account of accounts) {

        const apiPath = "/orders/get";
        const itemsPath = "/order/items/get";

        const lastSync = account.last_sync_time
            ? new Date(account.last_sync_time)
            : new Date(Date.now() - 10 * 60 * 1000);

        const now = new Date();

        let offset = 0;
        let hasMore = true;

        while (hasMore) {

            const params = {
                app_key: account.app_key,
                access_token: account.access_token,
                timestamp: Date.now().toString(),
                sign_method: "sha256",
                update_after: lastSync.toISOString(),
                update_before: now.toISOString(),
                limit: "100",
                offset: offset.toString()
            };

            params.sign = generateSignature(apiPath, params, account.app_secret);

            const response = await axios.get(
                `${account.api_base}${apiPath}`,
                { params, timeout: 15000 }
            );

            const orders = response.data?.data?.orders || [];

            if (orders.length === 0) break;

            for (let order of orders) {

                await orderModel.upsertOrder(order, account.account_code);

                const itemParams = {
                    app_key: account.app_key,
                    access_token: account.access_token,
                    timestamp: Date.now().toString(),
                    sign_method: "sha256",
                    order_id: order.order_id
                };

                itemParams.sign = generateSignature(itemsPath, itemParams, account.app_secret);

                const itemResponse = await axios.get(
                    `${account.api_base}${itemsPath}`,
                    { params: itemParams, timeout: 15000 }
                );

                const items = itemResponse.data?.data || [];

                await itemModel.replaceOrderItems(order.order_id, items);
            }

            if (orders.length < 100) {
                hasMore = false;
            } else {
                offset += 100;
            }
        }

        await accountModel.updateLastSync(account.account_code, now);
    }
};

exports.backfillOrders = async () => {

    const accounts = await accountModel.getAllAccounts();

    for (let account of accounts) {

        const apiPath = "/orders/get";
        const itemsPath = "/order/items/get";

        let startDate = new Date("2022-01-01T00:00:00Z");
        const today = new Date();

        while (startDate < today) {

            let endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);

            let offset = 0;
            let hasMore = true;

            while (hasMore) {

                const params = {
                    app_key: account.app_key,
                    access_token: account.access_token,
                    timestamp: Date.now().toString(),
                    sign_method: "sha256",
                    update_after: startDate.toISOString(),
                    update_before: endDate.toISOString(),
                    limit: "100",
                    offset: offset.toString()
                };

                params.sign = generateSignature(apiPath, params, account.app_secret);

                const response = await axios.get(
                    `${account.api_base}${apiPath}`,
                    { params }
                );

                const orders = response.data?.data?.orders || [];

                if (orders.length === 0) break;

                for (let order of orders) {

                    await orderModel.upsertOrder(order, account.account_code);

                    const itemParams = {
                        app_key: account.app_key,
                        access_token: account.access_token,
                        timestamp: Date.now().toString(),
                        sign_method: "sha256",
                        order_id: order.order_id
                    };

                    itemParams.sign = generateSignature(itemsPath, itemParams, account.app_secret);

                    const itemResponse = await axios.get(
                        `${account.api_base}${itemsPath}`,
                        { params: itemParams }
                    );

                    const items = itemResponse.data?.data || [];

                    await itemModel.replaceOrderItems(order.order_id, items);
                }

                if (orders.length < 100) {
                    hasMore = false;
                } else {
                    offset += 100;
                }
            }

            startDate = endDate;
        }

        await accountModel.updateLastSync(account.account_code, today);
    }
};

exports.getOrders = async (req, res) => {
    try {

        const [orders] = await db.query(`
            SELECT o.*, a.account_name
            FROM orders o
            JOIN daraz_accounts a 
                ON o.account_code = a.account_code
            ORDER BY o.created_at_daraz DESC
        `);

        for (let order of orders) {

            const [items] = await db.query(
                "SELECT * FROM order_items WHERE order_id = ?",
                [order.order_id]
            );

            order.products = items;
            order.statuses = [order.order_status];
            order.address_billing = JSON.parse(order.address_billing || "{}");
            order.address_shipping = JSON.parse(order.address_shipping || "{}");
        }

        const totalSales = orders.reduce((sum, order) => {
            if (order.order_status === "delivered") {
                return sum + Number(order.price || 0);
            }
            return sum;
        }, 0);

        res.json({
            totalAccounts: new Set(orders.map(o => o.account_code)).size,
            totalOrders: orders.length,
            totalSales,
            orders
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
