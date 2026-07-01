import { X } from 'lucide-react';

export default function FilterDrawer({ open, filters, setFilters, options, onClose, onReset }) {
  if (!open) return null;
  const accounts = options?.accounts || [];
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Filter Orders</h3>
            <p className="text-sm text-slate-500">Select account, marketplace, country, date, and value filters.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <label><span className="label">Marketplace</span><select className="input" value={filters.marketplace} onChange={(e) => update('marketplace', e.target.value)}><option value="all">All</option><option value="daraz">Daraz</option><option value="woo">WooCommerce</option><option value="manual">Manual</option></select></label>
          <label><span className="label">Account</span><select className="input" value={filters.account} onChange={(e) => update('account', e.target.value)}><option value="">All accounts</option>{accounts.map((account) => <option key={`${account.platform_code}-${account.account_id}-${account.account_name}`} value={account.account_name || account.account_code}>{account.platform_code} · {account.account_name || account.account_code}</option>)}</select></label>
          <label><span className="label">Country / City</span><select className="input" value={filters.country} onChange={(e) => update('country', e.target.value)}><option value="">All locations</option>{(options?.countries || []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span className="label">Payment</span><select className="input" value={filters.payment} onChange={(e) => update('payment', e.target.value)}><option value="">All payments</option>{(options?.payments || []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span className="label">Waybill</span><select className="input" value={filters.hasWaybill} onChange={(e) => update('hasWaybill', e.target.value)}><option value="all">All</option><option value="yes">With waybill</option><option value="no">Without waybill</option></select></label>
          <label><span className="label">Date From</span><input className="input" type="date" value={filters.dateFrom} onChange={(e) => update('dateFrom', e.target.value)} /></label>
          <label><span className="label">Date To</span><input className="input" type="date" value={filters.dateTo} onChange={(e) => update('dateTo', e.target.value)} /></label>
          <label><span className="label">Min Total</span><input className="input" type="number" value={filters.minTotal} onChange={(e) => update('minTotal', e.target.value)} /></label>
          <label><span className="label">Max Total</span><input className="input" type="number" value={filters.maxTotal} onChange={(e) => update('maxTotal', e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" className="btn-muted" onClick={onReset}>Reset</button>
          <button type="button" className="btn-primary" onClick={onClose}>Apply Filter</button>
        </div>
      </div>
    </div>
  );
}
