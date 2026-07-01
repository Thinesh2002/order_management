import { Banknote, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react';
import { money } from '../../../utils/format';

function num(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
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
    order.daraz_live?.live_order ||
    order.raw_payload ||
    order.daraz_order?.raw_payload ||
    {};

  const parsed = safeJson(payload);
  return parsed?.data || parsed?.result?.data || parsed || {};
}

function getFallbackOrderTotal(order) {
  const liveOrder = getLiveOrder(order);

  const productTotal = num(
    order.grand_total ||
      order.total_amount ||
      order.total ||
      liveOrder.price ||
      order.price ||
      order.item_total ||
      order.subtotal
  );

  const shippingPaid = num(
    order.shipping_fee ||
      order.shipping_paid ||
      liveOrder.shipping_fee ||
      liveOrder.shipping_fee_original
  );

  return productTotal + shippingPaid;
}

function calculateFinance(order, transactions = []) {
  const hasFinance = transactions.length > 0;

  if (!hasFinance) {
    return {
      totalOrder: getFallbackOrderTotal(order),
      totalExpense: null,
      totalIncome: null,
      hasFinance: false,
      note: 'Daraz finance not available yet',
    };
  }

  const totalBuyerPaid = transactions.reduce((sum, row) => {
    const amount = num(row.amount);
    return amount > 0 ? sum + amount : sum;
  }, 0);

  const totalExpense = transactions.reduce((sum, row) => {
    const amount = num(row.amount);
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);

  const netIncome = transactions.reduce((sum, row) => {
    return sum + num(row.amount);
  }, 0);

  return {
    totalOrder: totalBuyerPaid,
    totalExpense,
    totalIncome: netIncome,
    hasFinance: true,
    note: `${transactions.length} finance line(s)`,
  };
}

function FinanceCard({ label, value, icon: Icon, tone = 'slate', note }) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function FinanceSummaryCards({ order, transactions = [] }) {
  const currency = order.currency || 'LKR';
  const finance = calculateFinance(order, transactions);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <FinanceCard
        label="Total order"
        value={money(finance.totalOrder, currency)}
        icon={ReceiptText}
        tone="blue"
        note={
          finance.hasFinance
            ? 'Product + shipping paid by buyer'
            : 'Estimated order amount'
        }
      />

      <FinanceCard
        label="Total expense"
        value={
          finance.hasFinance
            ? money(finance.totalExpense, currency)
            : 'Pending'
        }
        icon={TrendingDown}
        tone={finance.hasFinance ? 'red' : 'amber'}
        note={
          finance.hasFinance
            ? 'All negative finance lines'
            : 'Waiting for Daraz finance'
        }
      />

      <FinanceCard
        label="Total income"
        value={
          finance.hasFinance
            ? money(finance.totalIncome, currency)
            : 'Pending'
        }
        icon={TrendingUp}
        tone={finance.hasFinance ? 'green' : 'amber'}
        note={
          finance.hasFinance
            ? 'Net finance amount'
            : 'Final income not ready'
        }
      />

      <FinanceCard
        label="Finance status"
        value={finance.hasFinance ? 'Available' : 'Pending'}
        icon={Banknote}
        tone={finance.hasFinance ? 'green' : 'slate'}
        note={finance.note}
      />
    </div>
  );
}