const productTrendModel = require("../../../models/daraz/product_moving_trend/product_moving_trend_model");

exports.getProductMovingTrend = async (req, res) => {
    try {

        const data = await productTrendModel.getProductTrend();

        const result = data.map(product => {

            const last30Qty = Number(product.last_30_days_qty) || 0;
            const last90Qty = Number(product.last_90_days_qty) || 0;

            const previous30 = last90Qty - last30Qty;

            let growthRate = 0;
            if (previous30 > 0) {
                growthRate = ((last30Qty - previous30) / previous30) * 100;
            }

            const avgDailySales = last30Qty / 30;
            const predictedNext30Days = Math.ceil(avgDailySales * 30);

            let movementSpeed = "Slow";
            if (avgDailySales >= 5) movementSpeed = "Fast";
            else if (avgDailySales >= 2) movementSpeed = "Medium";

            return {
                product_name: product.product_name,
                sku: product.sku,

                product_image: product.product_image || null,

                last_30_days_orders: Number(product.last_30_days_orders),
                last_90_days_orders: Number(product.last_90_days_orders),

                last_30_days_qty: last30Qty,
                last_90_days_qty: last90Qty,

                total_quantity_sold: Number(product.total_quantity_sold),
                total_sales_amount: Number(product.total_sales_amount),

                growth_rate: growthRate.toFixed(2),
                movement_speed: movementSpeed,
                predicted_next_30_days: predictedNext30Days
            };
        });

        res.json({
            success: true,
            count: result.length,
            data: result
        });

    } catch (error) {
        console.error("TREND ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};
