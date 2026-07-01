import { Eye, PackageCheck, Truck } from 'lucide-react';
import { text } from '../../../utils/format';
import { buildTrackingRows, getMainPackage } from './darazTracking.js';

export default function DarazLogisticsPanel({ order, live, onTrack }) {
  const rows = buildTrackingRows(live);
  const latest = rows[0];
  const mainPackage = getMainPackage(order, rows);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Delivery tracking
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {text(latest?.title || order?.display_status || order?.status)}
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {text(latest?.description, 'Latest tracking update will show after Daraz refresh.')}
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={onTrack}>
          <Eye size={16} /> Track My Order
        </button>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <PackageCheck size={16} />
            <p className="text-xs font-medium uppercase tracking-wide">Package</p>
          </div>
          <p className="mt-2 break-words text-sm font-semibold text-slate-900">
            {text(mainPackage.packageId)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Truck size={16} />
            <p className="text-xs font-medium uppercase tracking-wide">Tracking</p>
          </div>
          <p className="mt-2 break-words text-sm font-semibold text-slate-900">
            {text(mainPackage.trackingNumber)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last update
          </p>
          <p className="mt-2 break-words text-sm font-semibold text-slate-900">
            {text(latest?.timeText)}
          </p>
        </div>
      </div>
    </div>
  );
}