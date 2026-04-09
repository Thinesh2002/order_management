const axios = require("axios");
const db = require("../../db/db");

const BASE_URL = process.env.TRANS_EXPRESS_BASE_URL;
const TOKEN = process.env.TRANS_EXPRESS_TOKEN;

// ==============================
// 📦 TRACK ORDER + SAVE / UPDATE DB
// ==============================
exports.trackOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { waybill_id } = req.body;

    if (!waybill_id) {
      return res.status(400).json({
        success: false,
        message: "waybill_id is required",
      });
    }

    // 🔹 1. TRANS EX API CALL
    const response = await axios.post(
      `${BASE_URL}/tracking`,
      { waybill_id },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = response.data;
    console.log("TransEx Response:", data);

    // 🔹 2. RESPONSE STRUCTURE
    const order = data?.data;

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found in TransEx",
      });
    }

    // 🔹 3. COMMON VALUES
    const status = order.current_status || "Pending";
    const orderId = order.order_no || order.waybill_id;

    // 🔹 4. CHECK EXISTING ORDER
    const [existing] = await conn.execute(
      "SELECT order_id FROM manual_orders WHERE waybill_id = ?",
      [order.waybill_id]
    );

    // ==========================
    // 🔄 UPDATE EXISTING ORDER
    // ==========================
    if (existing.length > 0) {

      await conn.execute(
        `UPDATE manual_orders 
         SET 
           order_status = ?, 
           courier_status = ?, 
           tracking_number = ?, 
           note = ?
         WHERE waybill_id = ?`,
        [
          status,
          status,
          order.waybill_id,
          order.customer_address,
          order.waybill_id
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Order updated successfully",
        data: order
      });
    }

    // ==========================
    // 🆕 INSERT NEW ORDER
    // ==========================
    await conn.execute(
      `INSERT INTO manual_orders
      (
        order_id,
        customer_code,
        payment_method,
        order_status,
        order_date,
        note,
        item_total,
        discount,
        subtotal,
        shipping_cost_actual,
        shipping_cost_fixed,
        paid_amount,
        order_total,
        tracking_number,
        created_by,
        waybill_id,
        courier_status
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderId,
        null,
        "COD",
        status,
        order.placed_date || null,
        order.customer_address,
        0,
        0,
        0,
        0,
        450,
        0,
        0,
        order.waybill_id,
        "transex",
        order.waybill_id,
        status
      ]
    );

    res.status(200).json({
      success: true,
      message: "Order saved successfully",
      data: order
    });

  } catch (error) {

    console.error("TransEx Error:", error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });

  } finally {
    conn.release();
  }
};

// ==============================
// 📦 CREATE ORDER IN COURIER (UNCHANGED)
// ==============================
exports.createCourierOrder = async (req, res) => {
  try {
    const payload = req.body;

    const response = await axios.post(
      `${BASE_URL}/orders/upload/auto`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });

  } catch (error) {
    console.error("Courier Create Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
};

// ==============================
// ❌ NOT SUPPORTED
// ==============================
exports.getAllOrders = async (req, res) => {
  res.status(200).json({
    message: "Not supported",
  });
};