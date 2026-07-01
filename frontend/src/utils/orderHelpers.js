import { text } from './format';

export const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'to_pack', label: 'To Pack' },
  { key: 'to_arrange', label: 'To Arrange Shipment' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

export const STATUS_MATCH = {
  new: ['new', 'pending', 'unpaid', 'created'],
  to_pack: ['topack', 'to_pack', 'to pack', 'processing', 'confirmed'],
  to_arrange: ['to_arrange_shipment', 'to arrange shipment', 'arrange shipment', 'packed', 'packed_by_seller'],
  ready_to_ship: ['ready_to_ship', 'ready to ship', 'rts'],
  shipped: ['dispatched', 'shipped', 'shipping', 'in_transit', 'in transit', 'toship', 'to_ship'],
  delivered: ['delivered', 'completed'],
  cancelled: ['cancelled', 'canceled', 'failed'],
  returned: ['returned', 'return'],
};

export function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function orderStatusKey(order) {
  return normalize(order.status_key || order.display_status || order.order_status || order.status);
}

export function matchesStatus(order, activeStatus) {
  if (activeStatus === 'all') return true;
  const key = orderStatusKey(order);
  const list = STATUS_MATCH[activeStatus] || [activeStatus];
  return list.some((statusText) => key === normalize(statusText) || key.includes(normalize(statusText)));
}

export function hasAnyStatus(order, values) {
  const key = orderStatusKey(order);
  return values.some((value) => key === normalize(value) || key.includes(normalize(value)));
}

export function isFinalDarazStatus(order) {
  return hasAnyStatus(order, ['cancelled', 'canceled', 'delivered', 'returned', 'failed']);
}

export function canDarazPack(order) {
  if (order.source !== 'daraz' || isFinalDarazStatus(order)) return false;
  if (hasAnyStatus(order, ['packed', 'ready_to_ship', 'ready to ship', 'shipped', 'dispatched'])) return false;
  return hasAnyStatus(order, ['new', 'pending', 'unpaid', 'topack', 'to pack', 'to_pack', 'created']) || !orderStatusKey(order);
}

export function canDarazReady(order) {
  if (order.source !== 'daraz' || isFinalDarazStatus(order)) return false;
  if (hasAnyStatus(order, ['ready_to_ship', 'ready to ship', 'shipped', 'dispatched'])) return false;
  return hasAnyStatus(order, ['packed', 'to_arrange_shipment', 'to arrange shipment', 'arrange shipment']);
}

export function canDarazPrintAwb(order) {
  return order.source === 'daraz' && !isFinalDarazStatus(order);
}

export function countByStatus(orders) {
  return STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === 'all' ? orders.length : orders.filter((order) => matchesStatus(order, tab.key)).length;
    return acc;
  }, {});
}

export function cleanAddressPart(value) {
  const textValue = String(value ?? '').trim();
  if (!textValue || textValue === '[object Object]') return '';
  return textValue;
}

export function fullCustomerAddress(order) {
  return [
    order.shipping_address,
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_district,
    order.shipping_province,
    order.shipping_postal_code,
    order.shipping_country,
  ].map(cleanAddressPart).filter(Boolean).join(', ');
}

export function orderSearchText(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return [
    order.source,
    order.source_label,
    order.account_name,
    order.account_code,
    order.display_order_no,
    order.source_order_id,
    order.customer_id,
    order.customer_name,
    order.customer_phone,
    order.customer_email,
    order.shipping_name,
    order.shipping_phone,
    order.shipping_address,
    order.shipping_city,
    order.shipping_country,
    order.payment_method,
    order.waybill_id,
    order.tracking_number,
    ...items.flatMap((item) => [item.sku, item.local_sku, item.product_title, item.product_name]),
  ].map((value) => String(value ?? '')).join(' ').toLowerCase();
}

export function sourceClasses(order) {
  const source = normalize(order.source_label || order.source_type || order.source);
  if (normalize(order.source) === 'daraz') return 'bg-orange-100 text-orange-700 ring-orange-200';
  if (normalize(order.source) === 'woo') return 'bg-purple-100 text-purple-700 ring-purple-200';
  if (source.includes('whatsapp')) return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
  if (source.includes('facebook')) return 'bg-blue-100 text-blue-700 ring-blue-200';
  if (source.includes('tiktok')) return 'bg-slate-900 text-white ring-slate-700';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

export function sourceLabel(order) {
  const source = normalize(order.source);
  const account = text(order.account_name || order.account_code, '').replace(/\s+/g, '_').toLowerCase();
  const raw = text(order.source_label, '').replace(/\s+/g, '_').toLowerCase();
  if (source === 'manual') {
    if (raw.includes('facebook')) return `manual_facebook${account ? `_${account}` : ''}`;
    if (raw.includes('tiktok')) return `manual_tiktok${account ? `_${account}` : ''}`;
    if (raw.includes('whatsapp')) return `manual_whatsapp${account ? `_${account}` : ''}`;
    return `manual_other${account ? `_${account}` : ''}`;
  }
  if (source === 'daraz') return `daraz${account ? `_${account}` : ''}`;
  if (source === 'woo') return `woo${account ? `_${account}` : ''}`;
  return text(order.source_label || order.source);
}
