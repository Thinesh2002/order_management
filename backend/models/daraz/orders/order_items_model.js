const db = require("../../../db/db");

exports.replaceOrderItems = async (orderId, items) => {

    await db.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);

    if (!items || !Array.isArray(items) || items.length === 0) {
        return;
    }

    const values = items.map(item => ([
        orderId,
        item.product_id || null,
        item.sku || null,
        item.name || "",
        parseInt(item.quantity || 1),
        parseFloat(item.item_price || 0),
        item.product_main_image || ""
    ]));

    await db.query(
        `INSERT INTO order_items 
        (order_id, product_id, sku, product_name, quantity, price, image)
        VALUES ?`,
        [values]
    );
};
