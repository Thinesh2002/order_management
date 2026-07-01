const { clean } = require('../utils/dbUtils');
const customerModel = require('../models/customerModel');

function textValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return clean(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return [value.address1, value.address2, value.address3, value.address4, value.address5, value.address_1, value.address_2, value.city, value.state, value.region, value.post_code, value.postcode, value.postal_code, value.country]
      .map(textValue)
      .filter(Boolean)
      .join(', ');
  }
  return clean(value);
}

function addressLine(customer = {}) {
  return [customer.address, customer.shipping_address_line1, customer.shipping_address_line2]
    .map(textValue)
    .filter(Boolean)
    .join(', ')
    .slice(0, 255) || null;
}

async function upsertCustomer(connection, input = {}) {
  const name = clean(input.customer_name || input.name || input.shipping_full_name || input.buyer_name || 'Walk-in Customer');
  const phone = clean(input.phone || input.customer_phone || input.shipping_phone || input.buyer_phone);
  const email = clean(input.email || input.customer_email || input.buyer_email);
  const marketplaceCustomerId = clean(input.marketplace_customer_id || input.customer_id_external || input.customer_external_id);


  const existing = await customerModel.findExistingCustomer(connection, {
    marketplaceCustomerId,
    phone,
    email,
  });

  const data = {
    customer_name: name,
    customer_id_external: marketplaceCustomerId || null,
    marketplace_customer_id: marketplaceCustomerId || null,
    phone: phone || null,
    phone_alt: clean(input.phone_alt) || null,
    email: email || null,
    source_type: input.source_type || 'MANUAL',
    source_account_id: input.source_account_id || input.account_id || null,
    source_account_code: input.source_account_code || input.account_code || null,
    source_account_name: input.source_account_name || input.account_name || null,
    shipping_full_name: clean(input.shipping_full_name || name) || null,
    shipping_phone: clean(input.shipping_phone || phone) || null,
    shipping_address_line1: addressLine(input),
    shipping_address_line2: textValue(input.shipping_address_line2) || null,
    shipping_city: clean(input.shipping_city || input.city) || null,
    shipping_district: clean(input.shipping_district || input.district) || null,
    shipping_province: clean(input.shipping_province || input.province) || null,
    shipping_postal_code: clean(input.shipping_postal_code || input.postal_code) || null,
    shipping_country: clean(input.shipping_country || input.country || 'Sri Lanka') || 'Sri Lanka',
    billing_full_name: clean(input.billing_full_name || name) || null,
    billing_phone: clean(input.billing_phone || phone) || null,
    billing_address_line1: textValue(input.billing_address_line1 || input.shipping_address_line1 || input.address) || null,
    billing_address_line2: textValue(input.billing_address_line2) || null,
    billing_city: clean(input.billing_city || input.shipping_city || input.city) || null,
    billing_district: clean(input.billing_district || input.shipping_district || input.district) || null,
    billing_province: clean(input.billing_province || input.shipping_province || input.province) || null,
    billing_postal_code: clean(input.billing_postal_code || input.shipping_postal_code || input.postal_code) || null,
    billing_country: clean(input.billing_country || input.shipping_country || input.country || 'Sri Lanka') || 'Sri Lanka',
    customer_note: input.customer_note || null,
    internal_note: input.internal_note || null,
    last_order_at: new Date(),
  };

  if (existing) {
    return customerModel.updateCustomerAfterOrder(connection, existing.id, {
      ...data,
      order_total: Number(input.order_total || 0),
    });
  }

  return customerModel.createCustomer(connection, {
    ...data,
    order_total: Number(input.order_total || 0),
  });
}

module.exports = { upsertCustomer };
