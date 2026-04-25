const woocommerceModel = require("../../models/woo_orders/woo_orders_model");

const fetchOrders = async (req, res) => {
  try {
    const { page, per_page, status } = req.query;

    const orders = await woocommerceModel.getOrders({
      page,
      per_page,
      status,
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error,
    });
  }
};

module.exports = {
  fetchOrders,
};