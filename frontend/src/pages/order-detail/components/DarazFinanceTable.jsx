import Section from './Section.jsx';
import { money, text } from '../../../utils/format';

function totalAmount(transactions) {
  return transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export default function DarazFinanceTable({ transactions = [], currency = 'LKR' }) {
  return (
    <Section
      title="Finance"
      right={
        transactions.length ? (
          <span className="chip bg-slate-100 text-slate-700">
            Total {money(totalAmount(transactions), currency)}
          </span>
        ) : null
      }
    >
      {transactions.length ? (
        <div className="table-wrap rounded-xl">
          <table className="om-table text-xs">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction</th>
                <th>Fee / Reason</th>
                <th>Amount</th>
                <th>Paid Status</th>
                <th>Order Item</th>
                <th>SKU</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((row, index) => (
                <tr key={`${row.transaction_number || row.id || index}-${row.fee_type || ''}`}>
                  <td>{text(row.transaction_date)}</td>
                  <td>{text(row.transaction_type)}</td>
                  <td>{text(row.fee_name || row.fee_type || row.details)}</td>
                  <td>
                    <span
                      className={
                        Number(row.amount || 0) < 0
                          ? 'font-semibold text-red-600'
                          : 'font-semibold text-emerald-700'
                      }
                    >
                      {money(row.amount, currency)}
                    </span>
                  </td>
                  <td>{text(row.paid_status)}</td>
                  <td>{text(row.orderItem_no || row.order_item_no || row.trade_order_line_id)}</td>
                  <td>{text(row.seller_sku || row.lazada_sku)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            No finance transactions yet.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Daraz finance lines usually appear after Daraz creates transaction or payout records.
          </p>
        </div>
      )}
    </Section>
  );
}