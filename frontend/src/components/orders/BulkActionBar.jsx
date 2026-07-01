import { useState } from 'react';
import { PackageCheck, Play, Printer, Truck } from 'lucide-react';

const EXTRA_DARAZ_ACTIONS = [
  { value: 'get_shipment_providers', label: 'Get Shipment Providers' },
  { value: 'recreate_package', label: 'Recreate Package' },
  { value: 'confirm_dbs_delivered', label: 'Confirm DBS Delivered' },
  { value: 'failed_dbs_delivery', label: 'DBS Failed Delivery' },
  { value: 'deliver_digital', label: 'Deliver Digital' },
  { value: 'set_invoice_number', label: 'Set Invoice Number' },
];

export default function BulkActionBar({ selectedCount, onAction, busy, canPack, canReady, canAwb, hasDaraz }) {
  const [extraAction, setExtraAction] = useState('get_shipment_providers');

  if (!selectedCount) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-amber-50 px-4 py-2">
      <p className="text-sm text-amber-800">{selectedCount} selected</p>
      <div className="flex flex-wrap items-center gap-2">
        {canPack ? <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction('pack')}><PackageCheck size={15} /> Pack</button> : null}
        {canReady ? <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction('ready_to_ship')}><Truck size={15} /> Ready To Ship</button> : null}
        {canAwb ? <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction('print_awb')}><Printer size={15} /> Print AWB</button> : null}

        {hasDaraz ? (
          <div className="flex items-center gap-2">
            <select
              className="input h-9 min-w-[190px] bg-white py-1 text-xs"
              value={extraAction}
              disabled={busy}
              onChange={(event) => setExtraAction(event.target.value)}
            >
              {EXTRA_DARAZ_ACTIONS.map((action) => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
            <button type="button" className="btn-muted h-9" disabled={busy} onClick={() => onAction(extraAction)}>
              <Play size={14} /> Run
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
