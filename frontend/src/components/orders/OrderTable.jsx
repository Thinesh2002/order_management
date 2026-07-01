import { Link } from 'react-router-dom';
import { money, text } from '../../utils/format';
import { fullCustomerAddress } from '../../utils/orderHelpers';
import OrderActionsMenu from './OrderActionsMenu.jsx';

function getMarketplaceMeta(order) {
  const raw = [
    order.source,
    order.marketplace,
    order.marketplace_name,
    order.channel,
    order.channel_name,
    order.order_source,
    order.source_name,
    order.account_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (raw.includes('daraz')) {
    return {
      label: 'Daraz',
      cls: 'text-orange-600',
    };
  }

  if (raw.includes('woo') || raw.includes('woocommerce')) {
    return {
      label: 'Woo',
      cls: 'text-purple-600',
    };
  }

  if (raw.includes('facebook') || raw.includes('fb')) {
    return {
      label: 'Facebook',
      cls: 'text-blue-600',
    };
  }

  if (raw.includes('whatsapp') || raw.includes('manual')) {
    return {
      label: 'WhatsApp',
      cls: 'text-green-600',
    };
  }

  return {
    label: text(order.source || 'Manual'),
    cls: 'text-slate-600',
  };
}

function formatDateTime(value) {
  if (!value) {
    return {
      date: '-',
      time: '-',
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: text(value),
      time: '',
    };
  }

  return {
    date: date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    time: date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function MarketplaceCell({ order }) {
  const marketplace = getMarketplaceMeta(order);
  const dateTime = formatDateTime(order.order_date);

  return (
    <div className="min-w-[135px] max-w-[155px] space-y-0.5">
      <p className={`text-[12px] font-bold uppercase tracking-wide ${marketplace.cls}`}>
        {marketplace.label}
      </p>

      <p className="truncate text-[12px] font-medium text-slate-700">
        {text(order.account_name || order.account_code)}
      </p>

      <div className="pt-0.5 text-[11px] leading-4 text-slate-500">
        <p>{dateTime.date}</p>
        <p>{dateTime.time}</p>
      </div>
    </div>
  );
}

function StatusText({ value, statusKey }) {
  const key = String(statusKey || value || '').toLowerCase();

  const cls =
    key.includes('cancel') || key.includes('fail')
      ? 'text-red-600'
      : key.includes('deliver')
        ? 'text-emerald-600'
        : key.includes('ship') || key.includes('ready')
          ? 'text-blue-600'
          : 'text-amber-600';

  return (
    <span className={`text-[12px] font-semibold ${cls}`}>
      {text(value)}
    </span>
  );
}

function EmptyImage() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[10px] text-slate-400">
      No image
    </div>
  );
}

function getItemSku(item) {
  return (
    item.sku ||
    item.local_sku ||
    item.seller_sku ||
    item.platform_sku ||
    item.item_sku ||
    '-'
  );
}

function getItemQty(item) {
  return item.qty || item.quantity || item.item_qty || 1;
}

function OrderProductCell({ order, onImagePreview }) {
  const items = order.items || [];
  const first = order.first_item || items[0] || {};

  return (
    <div className="w-[330px] max-w-[330px]">
      <div className="space-y-1">
        <div className="flex max-w-[330px] flex-wrap items-center gap-1.5">
          <Link
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-blue-700 hover:underline"
            to={`/order-management/orders/${order.source}/${order.source_order_id}`}
          >
            {text(order.display_order_no)}
          </Link>

          {items.map((item, index) => (
            <span
              key={`${item.id || index}-${getItemSku(item)}`}
              className="inline-flex min-w-0 items-center gap-1"
            >
              <span className="max-w-[160px] truncate rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {text(getItemSku(item))}
              </span>

              <span className="shrink-0 text-[12px] font-semibold text-slate-900">
                × {text(getItemQty(item), 1)}
              </span>
            </span>
          ))}

          {order.source === 'manual' && (order.waybill_id || order.tracking_number) ? (
            <Link
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-cyan-100 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-700"
              to={`/order-management/tracking/${order.waybill_id || order.tracking_number}`}
            >
              WB {text(order.waybill_id || order.tracking_number)}
            </Link>
          ) : null}
        </div>

        <p className="max-w-[320px] truncate text-[12px] leading-4 text-slate-700">
          {text(first.product_title || first.product_name)}
        </p>

        <div className="flex h-11 w-[255px] items-center rounded-md border border-slate-200 bg-white px-1.5">
          {first.product_image_url ? (
            <button
              type="button"
              onClick={() =>
                onImagePreview({
                  url: first.product_image_url,
                  title: first.product_title || first.product_name,
                  sku: first.sku || first.local_sku,
                  orderNo: order.display_order_no,
                })
              }
              className="shrink-0"
            >
              <img
                src={first.product_image_url}
                alt="Product"
                className="h-9 w-9 rounded object-contain"
              />
            </button>
          ) : (
            <EmptyImage />
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderTable({
  orders = [],
  selectedIds,
  onToggle,
  onToggleAll,
  onCreateWaybill,
  onStatusChange,
  onDarazAction,
  onImagePreview,
  busy,
}) {
  if (!orders.length) {
    return (
      <div className="flex h-56 items-center justify-center bg-white text-sm text-slate-500">
        No orders found for the selected filter.
      </div>
    );
  }

  const allSelected = orders.every((order) =>
    selectedIds.has(`${order.source}:${order.source_order_id}`)
  );

  return (
    <div className="table-wrap rounded-none border-x-0">
      <table className="om-table table-fixed text-[13px]">
        <thead>
          <tr>
            <th className="w-[36px]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleAll(event.target.checked, orders)}
              />
            </th>

            <th className="w-[160px]">Marketplace</th>
            <th className="w-[345px]">Order / Product / SKU</th>
            <th className="w-[230px]">Customer details</th>
            <th className="w-[130px]">Total</th>
            <th className="w-[95px]">Status</th>
            <th className="w-[80px] text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => {
            const rowKey = `${order.source}:${order.source_order_id}`;

            return (
              <tr key={rowKey}>
                <td className="align-top">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(rowKey)}
                    onChange={() => onToggle(order)}
                  />
                </td>

                <td className="align-top">
                  <MarketplaceCell order={order} />
                </td>

                <td className="align-top">
                  <OrderProductCell
                    order={order}
                    onImagePreview={onImagePreview}
                  />
                </td>

                <td className="align-top">
                  <div className="max-w-[220px]">
                    <p className="truncate text-[12px] font-semibold text-slate-900">
                      {text(order.customer_name || order.shipping_name)}
                    </p>

                    <p className="truncate text-[11px] text-slate-600">
                      {text(order.customer_phone || order.shipping_phone)}
                    </p>

                    <p className="mt-0.5 max-h-8 overflow-hidden text-[11px] leading-4 text-slate-500">
                      {text(fullCustomerAddress(order), 'Address not available')}
                    </p>
                  </div>
                </td>

                <td className="align-top">
                  <div className="max-w-[120px]">
                    <p className="text-[12px] font-semibold text-slate-900">
                      {money(order.grand_total, order.currency)}
                    </p>

                    <p className="truncate text-[11px] text-slate-500">
                      Discount: {money(order.discount_total, order.currency)}
                    </p>

                    <p className="truncate text-[11px] text-slate-500">
                      {text(order.payment_method)}
                    </p>
                  </div>
                </td>

                <td className="align-top">
                  <StatusText
                    value={order.display_status || order.status}
                    statusKey={order.status_key}
                  />
                </td>

                <td className="align-top text-right">
                  <OrderActionsMenu
                    order={order}
                    onCreateWaybill={onCreateWaybill}
                    onStatusChange={onStatusChange}
                    onDarazAction={onDarazAction}
                    busy={busy}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}