const db = require("../../db/db");
const axios = require("axios");
const crypto = require("crypto");

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

exports.getOrders = async (req, res) => {
    try {
        const [accounts] = await db.query("SELECT * FROM daraz_accounts");

        let masterOrderMap = new Map();

        for (const account of accounts) {

            const apiPath = "/orders/get";
            const itemsPath = "/order/items/get";

            let endDate = new Date();
            let windowCount = 0;

            while (windowCount < 8) {

                let startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
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

                    for (const order of orders) {

                        // ✅ Fetch Order Items (Product Details)
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

                        if (!masterOrderMap.has(order.order_id)) {
                            masterOrderMap.set(order.order_id, {
                                ...order,
                                account_name: account.account_name,
                                products: items.map(item => ({
                                    title: item.name,
                                    sku: item.sku,
                                    seller_sku: item.seller_sku,
                                    product_id: item.product_id,
                                    quantity: item.quantity,
                                    price: item.item_price,
                                    image: item.product_main_image
                                }))
                            });
                        }
                    }

                    if (orders.length < 100) hasMore = false;
                    else offset += 100;
                }

                endDate = startDate;
                windowCount++;
            }
        }

        const allOrders = Array.from(masterOrderMap.values());

        const totalSales = allOrders.reduce(
            (sum, o) => sum + parseFloat(o.price || 0),
            0
        );

        return res.json({
            totalAccounts: accounts.length,
            totalOrders: allOrders.length,
            totalSales,
            orders: allOrders
        });

    } catch (error) {
        console.error("MASTER ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
};
