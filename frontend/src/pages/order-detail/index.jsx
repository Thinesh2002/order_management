import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  ClipboardList,
  Eye,
  Mail,
  MapPin,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  Truck,
  User,
} from 'lucide-react';

import { orderApi } from '../../api/orderApi';
import { money, niceDate, text } from '../../utils/format';
import { canDarazPrintAwb } from '../../utils/orderHelpers';
import { extractDarazActionMessage, openBlankPrintWindow, openDarazDocument, writePrintWindowMessage } from '../../utils/darazDocument';
import DarazApiPanel from './components/DarazApiPanel.jsx';
import DarazFinanceTable from './components/DarazFinanceTable.jsx';
import TrackOrderModal from './components/TrackOrderModal.jsx';

function num(value) {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value).replace(/,/g, '').trim();
  const isBracketNegative = raw.startsWith('(') && raw.endsWith(')');
  const cleaned = raw.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return 0;

  return isBracketNegative ? -Math.abs(parsed) : parsed;
}

function safeJson(value) {
  if (!value) return value;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getLiveOrder(order) {
  const payload =
    order?.daraz_live?.live_order ||
    order?.raw_payload ||
    order?.daraz_order?.raw_payload ||
    {};

  const parsed = safeJson(payload);

  return parsed?.data || parsed?.result?.data || parsed || {};
}

function isShippingFinanceLine(row) {
  const value = [
    row.fee_name,
    row.fee_type,
    row.transaction_type,
    row.details,
    row.comment,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return value.includes('shipping');
}

function getTransactionBreakdown(transactions = []) {
  let productPrice = 0;
  let shippingAmount = 0;
  let totalExpense = 0;
  let totalIncome = 0;

  const hasFinance = transactions.length > 0;

  transactions.forEach((row) => {
    const amount = num(row.amount);

    totalIncome += amount;

    if (amount > 0) {
      if (isShippingFinanceLine(row)) {
        shippingAmount += amount;
      } else {
        productPrice += amount;
      }
    }

    if (amount < 0) {
      totalExpense += Math.abs(amount);
    }
  });

  return {
    hasFinance,
    productPrice,
    shippingAmount,
    totalExpense,
    totalIncome,
    totalOrder: productPrice + shippingAmount,
  };
}

function getItemImage(item) {
  return item.product_main_image || item.product_image_url || item.image_url || item.image || '';
}

function getItemName(item) {
  return item.name || item.product_title || item.product_name || item.title || '-';
}

function getItemSku(item) {
  return item.sku || item.local_sku || item.seller_sku || item.shop_sku || '-';
}

function getItemQty(item) {
  return num(item.quantity || item.qty || item.item_quantity || 1) || 1;
}

function getItemUnitPrice(item) {
  const qty = getItemQty(item);
  const lineTotal = num(item.line_total || item.total_price || item.paid_price || item.subtotal);
  const directPrice = num(item.unit_price || item.price || item.item_price);

  if (directPrice) return directPrice;
  if (lineTotal && qty) return lineTotal / qty;

  return 0;
}

function getItemLineTotal(item) {
  const lineTotal = num(item.line_total || item.total_price || item.subtotal || item.paid_price);

  if (lineTotal) return lineTotal;

  return getItemUnitPrice(item) * getItemQty(item);
}

function getOrderProductPrice(order, items = []) {
  const liveOrder = getLiveOrder(order);

  const itemsSubtotal = items.reduce((sum, item) => {
    return sum + getItemLineTotal(item);
  }, 0);

  return num(
    itemsSubtotal ||
      order?.item_total ||
      order?.subtotal ||
      liveOrder?.price ||
      order?.price
  );
}

function getOrderShippingAmount(order) {
  const liveOrder = getLiveOrder(order);

  return num(
    order?.shipping_fee ||
      order?.shipping_paid ||
      order?.shipping_amount ||
      liveOrder?.shipping_fee ||
      liveOrder?.shipping_fee_original
  );
}

function getOrderDiscount(order) {
  const liveOrder = getLiveOrder(order);

  return num(
    order?.discount_total ||
      order?.discount ||
      order?.voucher ||
      liveOrder?.voucher ||
      0
  );
}

function getAmountBreakdown(order, items = [], transactions = []) {
  const tx = getTransactionBreakdown(transactions);

  const productPrice =
    tx.hasFinance && tx.productPrice > 0
      ? tx.productPrice
      : getOrderProductPrice(order, items);

  const shippingAmount =
    tx.hasFinance && tx.shippingAmount > 0
      ? tx.shippingAmount
      : getOrderShippingAmount(order);

  const discount = getOrderDiscount(order);
  const totalOrder = productPrice + shippingAmount - discount;

  return {
    productPrice,
    shippingAmount,
    discount,
    totalOrder,
    totalExpense: tx.hasFinance ? tx.totalExpense : null,
    totalIncome: tx.hasFinance ? tx.totalIncome : null,
    hasFinance: tx.hasFinance,
  };
}

function getOrderSummary(order, items = []) {
  const totalQty = items.reduce((sum, item) => sum + getItemQty(item), 0);
  const itemSubtotal = items.reduce((sum, item) => sum + getItemLineTotal(item), 0);

  const discount = getOrderDiscount(order);
  const shipping = getOrderShippingAmount(order);
  const total = itemSubtotal + shipping - discount;

  return {
    totalQty,
    itemSubtotal,
    discount,
    shipping,
    total,
  };
}

function Card({ children, className = '' }) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={18} className="text-slate-500" /> : null}
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>

      {right}
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {text(value)}
      </p>
    </div>
  );
}

function MoneyCard({ label, value, icon: Icon, tone = 'slate', note }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <Card className="group p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </p>

          {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
        </div>

        <div
          className={[
            'flex h-11 w-11 items-center justify-center rounded-xl ring-1',
            'transition-transform duration-300 group-hover:scale-105',
            toneClass,
          ].join(' ')}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function fullAddress(address = {}) {
  if (!address) return '-';
  if (typeof address === 'string') return address;

  return [
    address.address1,
    address.address2,
    address.address3,
    address.address4,
    address.address5,
    address.city,
    address.state,
    address.province,
    address.post_code,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function getShippingAddress(order) {
  const liveOrder = getLiveOrder(order);

  return (
    liveOrder.address_shipping ||
    order.address_shipping ||
    order.shipping_address ||
    {}
  );
}

function getBillingAddress(order) {
  const liveOrder = getLiveOrder(order);

  return (
    liveOrder.address_billing ||
    order.address_billing ||
    order.billing_address ||
    {}
  );
}

function OrderItemsCard({ order, items = [], currency }) {
  const summary = getOrderSummary(order, items);

  return (
    <Card>
      <CardTitle title="Item" />

      <div className="px-5 py-5">
        <div className="hidden border-b border-slate-200 pb-3 text-sm font-semibold text-slate-900 md:grid md:grid-cols-[80px_1fr_160px_160px_160px]">
          <div />
          <div>Product</div>
          <div>Quantity</div>
          <div>Price</div>
          <div>Subtotal</div>
        </div>

        <div className="divide-y divide-slate-100">
          {items.length ? (
            items.map((item, index) => (
              <div
                key={item.id || item.order_item_id || index}
                className="grid gap-4 py-5 md:grid-cols-[80px_1fr_160px_160px_160px]"
              >
                <div>
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {getItemImage(item) ? (
                      <img
                        src={getItemImage(item)}
                        alt={getItemName(item)}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium leading-5 text-blue-600">
                    {text(getItemName(item))}
                  </p>

                  {item.variation || item.variation_name ? (
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      variant_title : {text(item.variation || item.variation_name)}
                    </p>
                  ) : null}

                  <p className="mt-1 text-xs font-bold text-slate-900">
                    SKU : {text(getItemSku(item))}
                  </p>

                  {item.order_item_id || item.daraz_order_item_id ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Order Item ID : {text(item.order_item_id || item.daraz_order_item_id)}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 md:hidden">
                    Quantity
                  </p>

                  <p className="text-sm font-semibold text-slate-900">
                    {getItemQty(item)}
                  </p>

                  {item.status ? (
                    <span className="mt-4 inline-flex rounded-md bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
                      {text(item.status)}
                    </span>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 md:hidden">
                    Price
                  </p>

                  <p className="text-sm font-medium text-slate-900">
                    {money(getItemUnitPrice(item), currency)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 md:hidden">
                    Subtotal
                  </p>

                  <p className="text-sm font-medium text-slate-900">
                    {money(getItemLineTotal(item), currency)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">
              No items found.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-sm space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-bold text-slate-900">Total Quantity</span>
              <span className="font-medium text-slate-900">
                {summary.totalQty}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-bold text-emerald-700">Discount</span>
              <span className="font-medium text-emerald-700">
                - {money(summary.discount, currency)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-bold text-slate-900">Subtotal</span>
              <span className="font-medium text-slate-900">
                {money(summary.itemSubtotal, currency)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-bold text-slate-900">Shipping</span>
              <span className="font-medium text-slate-900">
                {money(summary.shipping, currency)}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
              <span className="font-black text-slate-900">Total</span>
              <span className="font-black text-slate-900">
                {money(summary.total, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CustomerCard({ order }) {
  const liveOrder = getLiveOrder(order);
  const shipping = getShippingAddress(order);

  const name =
    order.customer_name ||
    order.shipping_name ||
    `${text(liveOrder.customer_first_name, '')} ${text(liveOrder.customer_last_name, '')}`.trim();

  const phone = order.customer_phone || order.shipping_phone || shipping.phone;
  const email = order.customer_email || order.email || liveOrder.digital_delivery_info;

  return (
    <Card>
      <CardTitle icon={User} title="Customer" />

      <div className="space-y-4 p-5">
        <InfoLine label="Name" value={name} />

        <div className="flex items-start gap-3">
          <Phone size={16} className="mt-0.5 text-slate-400" />

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Phone
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {text(phone)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Mail size={16} className="mt-0.5 text-slate-400" />

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-900">
              {text(email)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AddressCard({ title, address }) {
  return (
    <Card>
      <CardTitle icon={MapPin} title={title} />

      <div className="p-5">
        <p className="whitespace-pre-line text-sm font-medium leading-6 text-slate-800">
          {text(fullAddress(address))}
        </p>
      </div>
    </Card>
  );
}

function TrackingMiniCard({ order, onTrack }) {
  const firstItem = order.items?.[0] || {};

  const tracking =
    firstItem.tracking_code ||
    firstItem.tracking_number ||
    order.waybill_id ||
    order.tracking_number;

  const packageId = firstItem.package_id || order.package_id;

  return (
    <Card>
      <CardTitle
        icon={Truck}
        title="Tracking"
        right={
          <button
            type="button"
            className="btn-primary h-9 px-3 text-xs"
            onClick={onTrack}
          >
            <Eye size={15} /> Track My Order
          </button>
        }
      />

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <InfoLine label="Package ID" value={packageId} />
        <InfoLine label="Tracking No" value={tracking} />
        <InfoLine
          label="Shipping Provider"
          value={firstItem.shipment_provider || order.shipment_provider}
        />
      </div>
    </Card>
  );
}

function SimpleHeader({ order }) {
  const orderNo = order.display_order_no || order.order_no || order.source_order_id || order.id;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <h1 className="text-xl font-semibold text-slate-900">
        Order #{text(orderNo)}
      </h1>

      <p className="text-sm font-medium text-slate-500">
        {niceDate(order.order_date || order.created_at)}
      </p>
    </div>
  );
}

export default function OrderDetailPage() {
  const { source, id } = useParams();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  async function load(refresh = true) {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await orderApi.getOrder(source, id, { refresh: refresh ? 1 : 0 });
      setOrder(result.data || result.order || result);
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Order load failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
  }, [source, id]);

  useEffect(() => {
    if (searchParams.get('print') === '1' && order) {
      setTimeout(() => window.print(), 500);
    }
  }, [searchParams, order]);

  async function darazAction(action) {
    const printWindow = action === 'print_awb' ? openBlankPrintWindow('Preparing AWB print...') : null;
    setBusy(true);

    try {
      const result = await orderApi.darazBulkAction({
        action,
        order_ids: [order.source_order_id || order.order_id || id],
      });

      const opened = action === 'print_awb'
        ? openDarazDocument(result, printWindow)
        : openDarazDocument(result);

      if (!opened && action === 'print_awb') {
        const message = extractDarazActionMessage(result) || 'AWB document not returned by Daraz.';
        writePrintWindowMessage(printWindow, message);
        alert(message);
      } else if (!opened && (result.data?.errors?.length || result.data?.skipped?.length)) {
        alert(extractDarazActionMessage(result));
      }

      await load(true);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Daraz action failed';
      if (action === 'print_awb') writePrintWindowMessage(printWindow, message);
      alert(message);
    } finally {
      setBusy(false);
    }
  }

  const transactions = useMemo(() => {
    if (!order) return [];

    return order.daraz_live?.finance_transactions?.length
      ? order.daraz_live.finance_transactions
      : order.daraz_cached?.transactions || [];
  }, [order]);

  if (loading && !order) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
        Loading order detail...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
        Order not found.
      </div>
    );
  }

  const items = order.items || [];
  const isDaraz = String(order.source || '').toLowerCase() === 'daraz';
  const amounts = getAmountBreakdown(order, items, transactions);

  const shippingAddress = getShippingAddress(order);
  const billingAddress = getBillingAddress(order);

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/order-management"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={16} /> Back to Orders
          </Link>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-muted" onClick={() => window.print()}>
              <Printer size={16} /> Print Invoice
            </button>

            {isDaraz ? (
              <button
                type="button"
                className="btn-muted"
                disabled={refreshing}
                onClick={() => load(true)}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            ) : null}

            {isDaraz ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setTrackOpen(true)}
              >
                <Eye size={16} /> Track My Order
              </button>
            ) : null}

            {isDaraz && canDarazPrintAwb(order) ? (
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => darazAction('print_awb')}
              >
                <Printer size={16} /> Print AWB
              </button>
            ) : null}
          </div>
        </div>

        <SimpleHeader order={order} />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MoneyCard
            label="Product Price"
            value={money(amounts.productPrice, order.currency)}
            icon={ReceiptText}
            tone="blue"
            note="Items product total"
          />

          <MoneyCard
            label="Shipping Amount"
            value={money(amounts.shippingAmount, order.currency)}
            icon={Truck}
            tone="slate"
            note="Buyer paid shipping"
          />

          <MoneyCard
            label="Total Order"
            value={money(amounts.totalOrder, order.currency)}
            icon={ReceiptText}
            tone="green"
            note="Product + shipping - discount"
          />

          <MoneyCard
            label="Total Expense"
            value={amounts.hasFinance ? money(amounts.totalExpense, order.currency) : 'Pending'}
            icon={Banknote}
            tone={amounts.hasFinance ? 'red' : 'amber'}
            note={amounts.hasFinance ? 'All negative finance lines' : 'Finance not ready'}
          />

          <MoneyCard
            label="Total Income"
            value={amounts.hasFinance ? money(amounts.totalIncome, order.currency) : 'Pending'}
            icon={Banknote}
            tone={amounts.hasFinance ? 'green' : 'amber'}
            note={amounts.hasFinance ? 'Net finance amount' : 'Waiting Daraz finance'}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            <OrderItemsCard order={order} items={items} currency={order.currency} />

            {isDaraz ? (
              <TrackingMiniCard order={order} onTrack={() => setTrackOpen(true)} />
            ) : null}

            {isDaraz ? (
              <>
                <DarazFinanceTable transactions={transactions} currency={order.currency} />
                <DarazApiPanel order={order} />
              </>
            ) : null}

            <Card>
              <CardTitle icon={ClipboardList} title="Notes / History" />

              <div className="p-5">
                <textarea
                  className="min-h-[110px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter order note..."
                />

                <div className="mt-3 flex justify-end">
                  <button type="button" className="btn-primary">
                    Save Note
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <aside className="space-y-4">
            <CustomerCard order={order} />
            <AddressCard title="Shipping Address" address={shippingAddress} />
            <AddressCard title="Billing Address" address={billingAddress} />
          </aside>
        </div>

        {isDaraz ? (
          <TrackOrderModal
            open={trackOpen}
            onClose={() => setTrackOpen(false)}
            order={order}
            live={order.daraz_live}
          />
        ) : null}
      </div>
    </section>
  );
}