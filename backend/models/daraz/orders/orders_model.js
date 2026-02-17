const db = require("../../../db/db");

exports.upsertOrder = async (order, accountCode) => {

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return d.toISOString().slice(0, 19).replace("T", " ");
    };

    const query = `
        INSERT INTO orders (
            order_id,
            order_number,
            account_code,
            customer_name,
            payment_method,
            order_status,
            price,
            shipping_fee,
            voucher,
            voucher_platform,
            voucher_seller,
            voucher_code,
            warehouse_code,
            gift_option,
            shipping_fee_original,
            shipping_fee_discount_platform,
            shipping_fee_discount_seller,
            buyer_note,
            items_count,
            created_at_daraz,
            updated_at_daraz,
            address_billing,
            address_shipping,
            extra_attributes,
            raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            order_number = VALUES(order_number),
            account_code = VALUES(account_code),
            customer_name = VALUES(customer_name),
            payment_method = VALUES(payment_method),
            order_status = VALUES(order_status),
            price = VALUES(price),
            shipping_fee = VALUES(shipping_fee),
            voucher = VALUES(voucher),
            voucher_platform = VALUES(voucher_platform),
            voucher_seller = VALUES(voucher_seller),
            voucher_code = VALUES(voucher_code),
            warehouse_code = VALUES(warehouse_code),
            gift_option = VALUES(gift_option),
            shipping_fee_original = VALUES(shipping_fee_original),
            shipping_fee_discount_platform = VALUES(shipping_fee_discount_platform),
            shipping_fee_discount_seller = VALUES(shipping_fee_discount_seller),
            buyer_note = VALUES(buyer_note),
            items_count = VALUES(items_count),
            created_at_daraz = VALUES(created_at_daraz),
            updated_at_daraz = VALUES(updated_at_daraz),
            address_billing = VALUES(address_billing),
            address_shipping = VALUES(address_shipping),
            extra_attributes = VALUES(extra_attributes),
            raw_json = VALUES(raw_json)
    `;

    await db.query(query, [
        order.order_id,
        order.order_number || null,
        accountCode,
        order.customer_first_name || "",
        order.payment_method || "",
        order.statuses?.[0] || "",
        Number(order.price) || 0,
        Number(order.shipping_fee) || 0,
        Number(order.voucher) || 0,
        Number(order.voucher_platform) || 0,
        Number(order.voucher_seller) || 0,
        order.voucher_code || "",
        order.warehouse_code || "",
        order.gift_option ? 1 : 0,
        Number(order.shipping_fee_original) || 0,
        Number(order.shipping_fee_discount_platform) || 0,
        Number(order.shipping_fee_discount_seller) || 0,
        order.buyer_note || "",
        Number(order.items_count) || 0,
        formatDate(order.created_at),
        formatDate(order.updated_at),
        JSON.stringify(order.address_billing || {}),
        JSON.stringify(order.address_shipping || {}),
        JSON.stringify(order.extra_attributes || {}),
        JSON.stringify(order)
    ]);
};
