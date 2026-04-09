const db = require("../../../db/db");

const DEFAULTS = {
  quantity: 1,
  price: 0,
  name: "",
  image: "",
};

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.map((item, index) => {
    if (!item.product_id && !item.sku) {
      throw new Error(`Item at index ${index} must have a product_id or sku`);
    }

    const quantity = parseInt(item.quantity, 10);
    const price = parseFloat(item.item_price);

    if (!Number.isNaN(quantity) && quantity < 0) {
      throw new Error(`Item at index ${index} has a negative quantity`);
    }
    if (!Number.isNaN(price) && price < 0) {
      throw new Error(`Item at index ${index} has a negative price`);
    }

    return {
      product_id: item.product_id || null,
      sku: item.sku || null,
      name: item.name || DEFAULTS.name,
      quantity: Number.isNaN(quantity) ? DEFAULTS.quantity : quantity,
      price: Number.isNaN(price) ? DEFAULTS.price : price,
      image: item.product_main_image || DEFAULTS.image,
    };
  });
}

function buildInsertValues(orderId, validatedItems) {
  return validatedItems.map((item) => [
    orderId,
    item.product_id,
    item.sku,
    item.name,
    item.quantity,
    item.price,
    item.image,
  ]);
}

exports.replaceOrderItems = async (orderId, items) => {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const validatedItems = validateItems(items);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "DELETE FROM order_items WHERE order_id = ?",
      [orderId]
    );

    if (validatedItems.length > 0) {
      const values = buildInsertValues(orderId, validatedItems);
      await connection.query(
        `INSERT INTO order_items 
         (order_id, product_id, sku, product_name, quantity, price, image)
         VALUES ?`,
        [values]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};