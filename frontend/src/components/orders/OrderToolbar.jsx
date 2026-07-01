import { Link } from 'react-router-dom';
import { Filter, Plus, Search } from 'lucide-react';
import StatusTabs from './StatusTabs.jsx';

export default function OrderToolbar({ status, setStatus, counts, query, setQuery, onOpenFilter, activeFilterCount }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <StatusTabs status={status} setStatus={setStatus} counts={counts} />
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="flex h-10 w-full max-w-xl items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, customer, phone, address, SKU, product"
              className="h-full w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <button type="button" className="icon-btn relative" onClick={onOpenFilter} aria-label="Filters">
            <Filter size={16} />
            {activeFilterCount ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{activeFilterCount}</span> : null}
          </button>
          <Link to="/order-management/create" className="btn-primary whitespace-nowrap"><Plus size={16} /> Create Order</Link>
        </div>
      </div>
    </div>
  );
}
