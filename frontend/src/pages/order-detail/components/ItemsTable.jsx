import { money, text } from '../../../utils/format';

export default function ItemsTable({ items = [], currency }) {
  return (
    <div className="table-wrap print-card">
      <table className="om-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>SKU</th>
            <th>Product</th>
            <th>Order Item ID</th>
            <th>Package / Tracking</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.id || index}-${item.sku || item.daraz_order_item_id}`}>
              <td>{item.product_image_url ? <img src={item.product_image_url} alt={item.product_title || item.sku} className="h-14 w-14 rounded-lg border border-slate-200 object-contain" /> : '-'}</td>
              <td><span className="chip bg-orange-100 text-orange-700">{text(item.sku || item.seller_sku || item.local_sku)}</span></td>
              <td>{text(item.product_title || item.product_name || item.name)}</td>
              <td>{text(item.daraz_order_item_id || item.woo_line_item_id || item.id)}</td>
              <td>
                <p className="text-xs text-slate-900">{text(item.package_id)}</p>
                <p className="text-xs text-slate-500">{text(item.tracking_code || item.tracking_number)}</p>
              </td>
              <td>{text(item.qty || item.quantity, 0)}</td>
              <td>{money(item.unit_price || item.paid_price || item.item_price, currency)}</td>
              <td>{money(item.line_total || Number(item.qty || 0) * Number(item.unit_price || item.paid_price || item.item_price || 0), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
