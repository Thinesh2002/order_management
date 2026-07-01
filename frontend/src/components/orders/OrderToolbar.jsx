import { Link } from 'react-router-dom';
import { Filter, Plus } from 'lucide-react';
import StatusTabs from './StatusTabs.jsx';

export default function OrderToolbar({ status, setStatus, counts, onOpenFilter, activeFilterCount }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <StatusTabs status={status} setStatus={setStatus} counts={counts} />
        <div className="flex flex-1 items-center justify-end gap-2">
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
