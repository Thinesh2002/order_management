const db = require("../../db/db");

const Customer = {

  /* CREATE + DUPLICATE CHECK */
  create: async (data) => {

    // Check duplicate
    const [existing] = await db.execute(
      `SELECT * FROM customers WHERE phone_1=? LIMIT 1`,
      [data.phone_1]
    );

    if (existing.length > 0) {
      return {
        customer: existing[0],
        isNew: false
      };
    }

    const customer_code = "CUS" + Date.now();

    const sql = `
      INSERT INTO customers 
      (customer_code, customer_name, company_name, phone_1, phone_2, email,
      address_line1, address_line2, city, province, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `;

    const [result] = await db.execute(sql, [
      customer_code,
      data.customer_name,
      data.company_name,
      data.phone_1,
      data.phone_2 || null,
      data.email,
      data.address_line1,
      data.address_line2,
      data.city,
      data.province,
      data.created_by || "admin"
    ]);

    const [newCustomer] = await db.execute(
      `SELECT * FROM customers WHERE id=?`,
      [result.insertId]
    );

    return {
      customer: newCustomer[0],
      isNew: true
    };
  },

  /* GET ALL */
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT * FROM customers ORDER BY created_at DESC`
    );
    return rows;
  },

  /* GET BY PHONE EXACT */
  getByPhone: async (phone) => {
    const [rows] = await db.execute(
      `SELECT * FROM customers WHERE phone_1=? LIMIT 1`,
      [phone]
    );
    return rows[0];
  },

  /* 🔥 SEARCH (FOR DROPDOWN) */
searchByPhone: async (phone) => {

  const [rows] = await db.execute(
    `SELECT * FROM customers 
     WHERE phone_1 LIKE ? OR customer_name LIKE ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [`%${phone}%`, `%${phone}%`]
  );

  return rows;
}

};

module.exports = Customer;