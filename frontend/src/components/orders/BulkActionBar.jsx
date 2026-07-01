import { PackageCheck, Printer, Truck } from 'lucide-react';

export default function BulkActionBar({ selectedCount, onAction, busy, canPack, canReady, canAwb }) {
  if (!selectedCount) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-amber-50 px-4 py-2">
      <p className="text-sm text-amber-800">{selectedCount} selected</p>
      <div className="flex flex-wrap gap-2">
        {canPack ? <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction('pack')}><PackageCheck size={15} /> Pack</button> : null}
        {canReady ? <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction('ready_to_ship')}><Truck size={15} /> Ready To Ship</button> : null}
        {canAwb ? <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction('print_awb')}><Printer size={15} /> Print AWB</button> : null}
      </div>
    </div>
  );
}
