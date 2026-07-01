const { orderDb } = require('../config/db');
const baseModel = require('./baseModel');

function findCustomerById(id) {
  return baseModel.findById(orderDb, 'customers', id);
}

async function findExistingCustomer(connection, { marketplaceCustomerId, phone, email }) {
  const findValues = [];
  const findWhere = [];
  if (marketplaceCustomerId) { findWhere.push('marketplace_customer_id = ?'); findValues.push(marketplaceCustomerId); }
  if (phone) { findWhere.push('phone = ?'); findValues.push(phone); }
  if (email) { findWhere.push('email = ?'); findValues.push(email); }
  if (!findWhere.length) return null;

  const [rows] = await connection.query(
    `SELECT * FROM customers WHERE ${findWhere.map((clause) => `(${clause})`).join(' OR ')} ORDER BY id DESC LIMIT 1`,
    findValues,
  );
  return rows[0] || null;
}

async function createCustomer(connection, payload) {
  const [result] = await connection.query(
    `INSERT INTO customers
      (customer_code, customer_name, customer_id_external, marketplace_customer_id, phone, phone_alt, email,
       source_type, source_account_id, source_account_code, source_account_name,
       shipping_full_name, shipping_phone, shipping_address_line1, shipping_address_line2, shipping_city, shipping_district,
       shipping_province, shipping_postal_code, shipping_country,
       billing_full_name, billing_phone, billing_address_line1, billing_address_line2, billing_city, billing_district,
       billing_province, billing_postal_code, billing_country,
       customer_note, internal_note, total_orders, total_spent, last_order_at)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
    [
      null, payload.customer_name, payload.customer_id_external, payload.marketplace_customer_id, payload.phone, payload.phone_alt, payload.email,
      payload.source_type, payload.source_account_id, payload.source_account_code, payload.source_account_name,
      payload.shipping_full_name, payload.shipping_phone, payload.shipping_address_line1, payload.shipping_address_line2, payload.shipping_city, payload.shipping_district,
      payload.shipping_province, payload.shipping_postal_code, payload.shipping_country,
      payload.billing_full_name, payload.billing_phone, payload.billing_address_line1, payload.billing_address_line2, payload.billing_city, payload.billing_district,
      payload.billing_province, payload.billing_postal_code, payload.billing_country,
      payload.customer_note, payload.internal_note, Number(payload.order_total || 0),
    ],
  );

  const customerCode = `CUS${String(result.insertId).padStart(6, '0')}`;
  await connection.query('UPDATE customers SET customer_code = ? WHERE id = ?', [customerCode, result.insertId]);
  return result.insertId;
}

async function updateCustomerAfterOrder(connection, existingId, payload) {
  await connection.query(
    `UPDATE customers
     SET customer_name = ?, phone = COALESCE(?, phone), email = COALESCE(?, email),
         shipping_full_name = ?, shipping_phone = ?, shipping_address_line1 = ?, shipping_address_line2 = ?,
         shipping_city = ?, shipping_district = ?, shipping_province = ?, shipping_postal_code = ?, shipping_country = ?,
         source_type = ?, source_account_id = ?, source_account_code = ?, source_account_name = ?,
         total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [
      payload.customer_name, payload.phone, payload.email,
      payload.shipping_full_name, payload.shipping_phone, payload.shipping_address_line1, payload.shipping_address_line2,
      payload.shipping_city, payload.shipping_district, payload.shipping_province, payload.shipping_postal_code, payload.shipping_country,
      payload.source_type, payload.source_account_id, payload.source_account_code, payload.source_account_name,
      Number(payload.order_total || 0), existingId,
    ],
  );
  return existingId;
}

module.exports = {
  findCustomerById,
  findExistingCustomer,
  createCustomer,
  updateCustomerAfterOrder,
};
