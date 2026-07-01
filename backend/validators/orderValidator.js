const { clean, toInt } = require('../utils/dbUtils');

function validateManualOrderPayload(payload = {}) {
  const errors = [];
  const items = Array.isArray(payload.items) ? payload.items : [];
  const customer = payload.customer || {};
  const phone = clean(customer.phone || customer.phone_1 || customer.phone1 || customer.mobile || customer.customer_phone || payload.phone);

  if (!phone) errors.push('Customer Phone Number 1 is required.');
  if (!items.length) errors.push('At least one item is required.');

  items.forEach((item, index) => {
    if (!clean(item.sku || item.local_sku)) errors.push(`Item ${index + 1}: SKU is required.`);
    if (toInt(item.qty, 0) <= 0) errors.push(`Item ${index + 1}: qty must be greater than 0.`);
  });

  if (errors.length) return { valid: false, message: errors[0], errors };
  return { valid: true };
}

module.exports = { validateManualOrderPayload };
