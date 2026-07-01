import { money, niceDate, text } from '../../../utils/format';

function statusClass(status) {
  const value = String(status || '').toLowerCase();

  if (value.includes('ready')) return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
  if (value.includes('ship')) return 'bg-blue-100 text-blue-700 ring-blue-200';
  if (value.includes('deliver')) return 'bg-green-100 text-green-700 ring-green-200';
  if (value.includes('cancel') || value.includes('failed')) return 'bg-red-100 text-red-700 ring-red-200';
  if (value.includes('return')) return 'bg-amber-100 text-amber-700 ring-amber-200';

  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function SummaryCard({ label, value, strong = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`${strong ? 'text-xl' : 'text-sm'} mt-1 break-words font-semibold text-slate-900`}>
        {text(value)}
      </p>
    </div>
  );
}

export default function OrderSummary({ order }) {
  const status = order.display_status || order.status;
  const orderNo = order.display_order_no || order.order_no || order.source_order_id;

  return (
    <div className="print-card card overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Order overview
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              #{text(orderNo)}
            </h3>
          </div>

          <span className={`chip px-3 py-1 text-xs ring-1 ${statusClass(status)}`}>
            {text(status)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Customer" value={order.customer_name || order.shipping_name} />
        <SummaryCard label="Order date" value={niceDate(order.order_date)} />
        <SummaryCard label="Payment" value={order.payment_method} />
        <SummaryCard label="Total" value={money(order.grand_total, order.currency)} strong />

        <SummaryCard label="Subtotal" value={money(order.item_total || order.subtotal, order.currency)} />
        <SummaryCard label="Discount" value={money(order.discount_total, order.currency)} />
        <SummaryCard label="Shipping paid" value={money(order.shipping_fee, order.currency)} />
        <SummaryCard label="Customer ID" value={order.customer_id} />
      </div>
    </div>
  );
}