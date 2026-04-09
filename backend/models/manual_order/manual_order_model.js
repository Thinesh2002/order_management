const db = require("../../db/db");
const axios = require("axios");

const BASE_URL = process.env.TRANS_EXPRESS_BASE_URL;
const TOKEN = process.env.TRANS_EXPRESS_TOKEN;

const Order = {

  // ================= CREATE ORDER =================
  createOrder: async (order, items) => {

    const conn = await db.getConnection();

    try {

      if (!order || !Array.isArray(items) || items.length === 0) {
        throw new Error("Invalid order data");
      }

      if (!order.order_id) {
        throw new Error("Order ID is required");
      }

      await conn.beginTransaction();

      // ===== INSERT ORDER =====
      const orderSql = `
        INSERT INTO manual_orders
        (order_id, customer_code, payment_method, order_status, order_date, note,
        item_total, discount, subtotal, shipping_cost_actual, shipping_cost_fixed,
        paid_amount, order_total, tracking_number, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      const orderValues = [
        order.order_id,
        order.customer_code || null,
        order.payment_method || "COD",
        order.order_status || "Pending",
        order.order_date || new Date(),
        order.note || null,
        order.item_total || 0,
        order.discount || 0,
        order.subtotal || 0,
        order.shipping_cost_actual || 0,
        order.shipping_cost_fixed || 450,
        order.paid_amount || 0,
        order.order_total || 0,
        order.tracking_number || null,
        order.created_by || "admin"
      ];

      await conn.execute(orderSql, orderValues);

      // ===== INSERT ITEMS =====
      const itemSql = `
        INSERT INTO manual_order_items
        (order_id, sku, product_name, description, quantity, unit_price, item_total)
        VALUES (?,?,?,?,?,?,?)
      `;

      for (const item of items) {

        if (!item.product_name || !item.quantity) {
          throw new Error("Invalid item data");
        }

        const itemValues = [
          order.order_id,
          item.sku || null,
          item.product_name,
          item.description || null,
          item.quantity || 0,
          item.unit_price || 0,
          item.item_total || 0
        ];

        await conn.execute(itemSql, itemValues);
      }

      await conn.commit();

      // ===== COURIER (AFTER COMMIT) =====
      if (order.send_to_courier) {
        try {

          const [customer] = await db.execute(
            "SELECT * FROM customers WHERE id = ?",
            [order.customer_code]
          );

          if (customer.length > 0) {

            const c = customer[0];

            const payload = [
              {
                order_id: order.order_id,
                customer_name: c.customer_name,
                address: `${c.address_line1 || ""} ${c.address_line2 || ""}`,
                order_description: order.note || "",
                customer_phone: c.phone_1,
                customer_phone2: c.phone_2,
                cod_amount: order.order_total,
                city: 864,
                remarks: order.note || ""
              }
            ];

            const response = await axios.post(
              `${BASE_URL}/orders/upload/auto`,
              payload,
              {
                timeout: 10000,
                headers: {
                  Authorization: `Bearer ${TOKEN}`,
                  "Content-Type": "application/json",
                  Accept: "application/json"
                }
              }
            );

            const courierData = response?.data?.orders?.[0];

            if (courierData?.waybill_id) {
              await db.execute(
                `UPDATE manual_orders 
                 SET waybill_id=?, courier_status=? 
                 WHERE order_id=?`,
                [courierData.waybill_id, "Pending", order.order_id]
              );
            }

          }

        } catch (err) {
          console.error("Courier Error:", err.message);

          await db.execute(
            `UPDATE manual_orders 
             SET courier_status=? 
             WHERE order_id=?`,
            ["Failed", order.order_id]
          );
        }
      }

      return {
        success: true,
        message: "Order created successfully"
      };

    } catch (error) {

      await conn.rollback();

      console.error("Order Creation Error:", error);

      return {
        success: false,
        message: error.message || "Order creation failed"
      };

    } finally {
      conn.release();
    }

  },

  // ================= GET ALL ORDERS =================
  getAllOrders: async () => {

    try {

const [rows] = await db.execute(`
  SELECT 
    mo.*, 
    c.customer_name,

    -- SKU + QTY
    IFNULL(
      GROUP_CONCAT(
        DISTINCT 
        CASE 
          WHEN moi.sku IS NOT NULL 
          THEN CONCAT(moi.sku, ' x', moi.quantity)
        END
        SEPARATOR ', '
      ),
      'No SKU Data'
    ) AS sku_qty,

    -- ✅ ADD IMAGE
    (
      SELECT pi.main_image 
      FROM product_management.product_images pi
      WHERE pi.sku = moi.sku
      LIMIT 1
    ) AS preview_image

  FROM manual_orders mo

  LEFT JOIN customers c 
    ON mo.customer_code = c.id

  LEFT JOIN manual_order_items moi 
    ON mo.order_id = moi.order_id

  GROUP BY mo.order_id

  ORDER BY mo.created_at DESC
`);

      return rows;

    } catch (error) {
      console.error("Fetch Orders Error:", error);
      throw error;
    }

  },

  // ================= GET ORDER ITEMS =================
getOrderItems: async (order_id) => {

  try {

    const [rows] = await db.execute(`
      SELECT 
        moi.id,
        moi.order_id,
        moi.sku,
        moi.product_name,
        moi.description,
        moi.quantity,
        moi.unit_price,
        moi.item_total,
        moi.created_at,

        -- IMAGE FROM product_images
        pi.main_image AS preview_image

      FROM manual_order_items moi

      LEFT JOIN product_management.product_images pi 
        ON moi.sku = pi.sku

      WHERE moi.order_id = ?

      ORDER BY moi.id DESC
    `, [order_id]);

    return rows.map(row => ({
      ...row,
      preview_image: row.preview_image || null
    }));

  } catch (error) {
    console.error("Fetch Order Items Error:", error);
    throw error;
  }
},

  // ================= NEXT ORDER ID =================
  getNextOrderId: async () => {

    const [rows] = await db.execute(`
      SELECT order_id 
      FROM manual_orders 
      WHERE order_id LIKE 'BH%' 
      ORDER BY CAST(SUBSTRING(order_id, 3) AS UNSIGNED) DESC
      LIMIT 1
    `);

    let newOrderId = "BH001";

    if (rows.length > 0 && rows[0].order_id) {
      const lastNumber = parseInt(rows[0].order_id.replace("BH", ""));
      newOrderId = "BH" + String(lastNumber + 1).padStart(3, "0");
    }

    return newOrderId;
  }

};

module.exports = Order;