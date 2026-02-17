const db = require("../../../db/db");

exports.getProductTrend = async () => {

    const query = `
        SELECT 
            oi.product_name,
            oi.sku,

            MAX(oi.product_image) AS product_image,   

            COUNT(DISTINCT CASE 
                WHEN o.created_at_daraz >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                THEN o.order_id END
            ) AS last_30_days_orders,

            COUNT(DISTINCT CASE 
                WHEN o.created_at_daraz >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                THEN o.order_id END
            ) AS last_90_days_orders,

            SUM(CASE 
                WHEN o.created_at_daraz >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                THEN oi.quantity ELSE 0 END
            ) AS last_30_days_qty,

            SUM(CASE 
                WHEN o.created_at_daraz >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                THEN oi.quantity ELSE 0 END
            ) AS last_90_days_qty,

            SUM(oi.quantity) AS total_quantity_sold,

            SUM(oi.quantity * oi.price) AS total_sales_amount

        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_status = 'delivered'
        GROUP BY oi.product_name, oi.sku
        ORDER BY total_quantity_sold DESC
    `;

    const [rows] = await db.query(query);
    return rows;
};
