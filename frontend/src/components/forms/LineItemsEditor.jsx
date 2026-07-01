import { X } from 'lucide-react';
import { money, text } from '../../utils/format';

function lineTotal(item) {
  const qty = Number(item.qty || 0);
  const price = Number(item.unit_price || 0);
  const discount = Number(item.discount_amount || 0);
  return Math.max(qty * price - discount, 0);
}

export default function LineItemsEditor({ items, updateItem, addItem, removeItem, onSkuBlur, loadingIndex }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Order line items</h3>
        <p className="text-xs text-slate-500">Type SKU and product title, image, price, and stock will fill from product/inventory data.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Image</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Unit Price</th>
              <th className="px-3 py-2">Discount</th>
              <th className="px-3 py-2">Line Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="px-3 py-2 align-top"><input className="input w-44" value={item.sku} onChange={(e) => updateItem(index, 'sku', e.target.value)} onBlur={() => onSkuBlur(index)} placeholder="SKU" required />{item.lookup_status ? <p className="mt-1 text-[11px] text-slate-500">{item.lookup_status}</p> : null}</td>
                <td className="px-3 py-2 align-top">{item.product_image_url ? <img src={item.product_image_url} alt={item.product_title || item.sku} className="h-12 w-12 rounded-lg border border-slate-200 object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400">Auto</div>}</td>
                <td className="px-3 py-2 align-top"><input className="input min-w-72" value={item.product_title} onChange={(e) => updateItem(index, 'product_title', e.target.value)} placeholder="Description" required />{item.available_qty !== null && item.available_qty !== undefined ? <p className="mt-1 text-[11px] text-emerald-700">Available stock: {text(item.available_qty, 0)}</p> : null}</td>
                <td className="px-3 py-2 align-top"><input className="input w-20" type="number" min="1" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} /></td>
                <td className="px-3 py-2 align-top"><input className="input w-28" type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} /></td>
                <td className="px-3 py-2 align-top"><input className="input w-28" type="number" min="0" step="0.01" value={item.discount_amount} onChange={(e) => updateItem(index, 'discount_amount', e.target.value)} /></td>
                <td className="px-3 py-2 align-top text-sm font-medium text-slate-900">{money(lineTotal(item), 'Rs')}</td>
                <td className="px-3 py-2 align-top"><button type="button" className="icon-btn h-8 w-8" disabled={items.length === 1 || loadingIndex === index} onClick={() => removeItem(index)}><X size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <button type="button" className="btn-muted" onClick={addItem}>Add another line item</button>
      </div>
    </div>
  );
}
