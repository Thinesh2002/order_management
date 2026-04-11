const Order = require("../../models/manual_order/manual_order_model");

// ================= CREATE ORDER =================
exports.createOrder = async (req, res) => {
  try {
    const { order, items } = req.body;

    // ===== VALIDATION =====
    if (!order || typeof order !== "object") {
      return res.status(400).json({
        success: false,
        message: "Order data is required"
      });
    }

    if (!order.order_id || order.order_id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required"
      });
    }

    // ===== ITEM VALIDATION =====
    for (const item of items) {
      if (!item.product_name || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each item must have product_name and quantity"
        });
      }
    }

    const result = await Order.createOrder(order, items);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(201).json({
      success: true,
      order_id: order.order_id,
      message: result.message
    });

  } catch (error) {
    console.error("Create Order Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};


// ================= GET ALL ORDERS =================
exports.getOrders = async (req, res) => {
  try {
    const data = await Order.getAllOrders();

    return res.status(200).json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error("Get Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders"
    });
  }
};


// ================= GET ORDER ITEMS =================
exports.getOrderItems = async (req, res) => {
  try {
    const order_id = req.params.id;

    if (!order_id || order_id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    const data = await Order.getOrderItems(order_id);

    return res.status(200).json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data: Array.isArray(data) ? data : []
    });

  } catch (error) {
    console.error("Get Order Items Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch order items"
    });
  }
};


// ================= GET NEXT ORDER ID =================
exports.getNextOrderId = async (req, res) => {
  try {
    const order_id = await Order.getNextOrderId();

    if (!order_id) {
      return res.status(500).json({
        success: false,
        message: "Order ID generation failed"
      });
    }

    return res.status(200).json({
      success: true,
      order_id
    });

  } catch (error) {
    console.error("Get Next Order ID Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate order ID"
    });
  }
};



// ================= UPDATE ORDER =================
exports.updateOrder = async (req, res) => {
  try {
    const order_id = req.params.id;
    const { order, items } = req.body;

    // ===== DEBUG (TEMP) =====
    console.log("REQ BODY:", req.body);

    // ===== VALIDATION =====
    if (!order_id || order_id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    if (!order || typeof order !== "object") {
      return res.status(400).json({
        success: false,
        message: "Order data is required"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required"
      });
    }

    // ===== ITEM VALIDATION =====
    for (const item of items) {

      if (!item.product_name || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have product_name and quantity > 0"
        });
      }

      // ✅ FIX: convert types (CRITICAL)
      item.quantity = Number(item.quantity);
      item.unit_price = Number(item.unit_price || 0);
      item.item_total = Number(item.item_total || 0);
    }

    // ✅ OPTIONAL: clean order numbers
    order.item_total = Number(order.item_total || 0);
    order.discount = Number(order.discount || 0);
    order.subtotal = Number(order.subtotal || 0);
    order.shipping_cost_fixed = Number(order.shipping_cost_fixed || 0);
    order.order_total = Number(order.order_total || 0);

    const result = await Order.updateOrder(order_id, order, items);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      order_id,
      message: result.message
    });

  } catch (error) {
    console.error("Update Order Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};