const db = require("../../../db/db");

const TABLE = "orders";

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace("T", " ");
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function toJson(value, fallback = {}) {
  try {
    return JSON.stringify(value || fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

const COLUMN_DEFS = [
  { col: "order_id",                        extract: (o) => o.order_id },
  { col: "order_number",                    extract: (o) => o.order_number || null },
  { col: "account_code",                    extract: (_, ac) => ac },
  { col: "customer_name",                   extract: (o) => o.customer_first_name || "" },
  { col: "payment_method",                  extract: (o) => o.payment_method || "" },
  { col: "order_status",                    extract: (o) => o.statuses?.[0] || "" },
  { col: "price",                           extract: (o) => toNumber(o.price) },
  { col: "shipping_fee",                    extract: (o) => toNumber(o.shipping_fee) },
  { col: "voucher",                         extract: (o) => toNumber(o.voucher) },
  { col: "voucher_platform",                extract: (o) => toNumber(o.voucher_platform) },
  { col: "voucher_seller",                  extract: (o) => toNumber(o.voucher_seller) },
  { col: "voucher_code",                    extract: (o) => o.voucher_code || "" },
  { col: "warehouse_code",                  extract: (o) => o.warehouse_code || "" },
  { col: "gift_option",                     extract: (o) => o.gift_option ? 1 : 0 },
  { col: "shipping_fee_original",           extract: (o) => toNumber(o.shipping_fee_original) },
  { col: "shipping_fee_discount_platform",  extract: (o) => toNumber(o.shipping_fee_discount_platform) },
  { col: "shipping_fee_discount_seller",    extract: (o) => toNumber(o.shipping_fee_discount_seller) },
  { col: "buyer_note",                      extract: (o) => o.buyer_note || "" },
  { col: "items_count",                     extract: (o) => toNumber(o.items_count) },
  { col: "created_at_daraz",                extract: (o) => formatDate(o.created_at) },
  { col: "updated_at_daraz",                extract: (o) => formatDate(o.updated_at) },
  { col: "address_billing",                 extract: (o) => toJson(o.address_billing) },
  { col: "address_shipping",                extract: (o) => toJson(o.address_shipping) },
  { col: "extra_attributes",                extract: (o) => toJson(o.extra_attributes) },
  { col: "raw_json",                        extract: (o) => toJson(o) },
];

// Columns excluded from the ON DUPLICATE KEY UPDATE clause
const SKIP_ON_UPDATE = new Set(["order_id", "created_at_daraz"]);

function buildUpsertQuery() {
  const columns = COLUMN_DEFS.map((d) => d.col);
  const placeholders = columns.map(() => "?").join(", ");

  const updateClauses = columns
    .filter((col) => !SKIP_ON_UPDATE.has(col))
    .map((col) => `${col} = VALUES(${col})`)
    .join(",\n            ");

  return `
    INSERT INTO ${TABLE} (${columns.join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE
            ${updateClauses}
  `;
}

const UPSERT_SQL = buildUpsertQuery();

function extractValues(order, accountCode) {
  return COLUMN_DEFS.map((def) => def.extract(order, accountCode));
}

exports.upsertOrder = async (order, accountCode) => {
  if (!order?.order_id) {
    throw new Error("order must have an order_id");
  }
  if (!accountCode) {
    throw new Error("accountCode is required");
  }

  const values = extractValues(order, accountCode);
  const [result] = await db.query(UPSERT_SQL, values);

  return {
    orderId: order.order_id,
    created: result.affectedRows === 1,
    updated: result.affectedRows === 2,
  };
};

exports.upsertOrders = async (orders, accountCode) => {
  if (!accountCode) {
    throw new Error("accountCode is required");
  }
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const connection = await db.getConnection();
  const results = [];

  try {
    await connection.beginTransaction();

    for (const order of orders) {
      if (!order?.order_id) {
        throw new Error(`Order missing order_id: ${JSON.stringify(order).slice(0, 100)}`);
      }
      const values = extractValues(order, accountCode);
      const [result] = await connection.query(UPSERT_SQL, values);
      results.push({
        orderId: order.order_id,
        created: result.affectedRows === 1,
        updated: result.affectedRows === 2,
      });
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return results;
};