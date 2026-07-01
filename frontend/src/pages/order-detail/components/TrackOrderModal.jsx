import { Clock3, Copy, MapPin, PackageCheck, Truck, X } from 'lucide-react';
import { text } from '../../../utils/format';
import { buildTrackingRows, getMainPackage } from './darazTracking.js';

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(String(value));
}

export default function TrackOrderModal({ open, onClose, order, live }) {
  if (!open) return null;

  const rows = buildTrackingRows(live);
  const latest = rows[0];
  const mainPackage = getMainPackage(order, rows);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
              Track my order
            </p>
            <h3 className="mt-1 text-xl font-bold">
              {text(latest?.title || order?.display_status || order?.status)}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              {text(latest?.description, 'Tracking update not available yet.')}
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-92px)] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <PackageCheck size={16} />
                <p className="text-xs font-medium uppercase tracking-wide">Package ID</p>
              </div>
              <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                {text(mainPackage.packageId)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Truck size={16} />
                  <p className="text-xs font-medium uppercase tracking-wide">Tracking number</p>
                </div>

                {mainPackage.trackingNumber ? (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100"
                    onClick={() => copyText(mainPackage.trackingNumber)}
                    title="Copy tracking number"
                  >
                    <Copy size={14} />
                  </button>
                ) : null}
              </div>

              <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                {text(mainPackage.trackingNumber)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin size={16} />
                <p className="text-xs font-medium uppercase tracking-wide">Courier</p>
              </div>
              <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                {text(mainPackage.provider)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-900">Tracking timeline</h4>
              <span className="text-xs text-slate-500">{rows.length} update(s)</span>
            </div>

            {rows.length ? (
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <div key={row.key} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          index === 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {index === 0 ? <PackageCheck size={17} /> : <Clock3 size={16} />}
                      </div>

                      {index !== rows.length - 1 ? (
                        <div className="mt-2 h-full min-h-8 w-px bg-slate-200" />
                      ) : null}
                    </div>

                    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {text(row.title)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {text(row.description)}
                          </p>
                        </div>

                        <span className="chip bg-slate-100 text-slate-600">
                          {text(row.statusCode || row.detailType)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Time: {text(row.timeText)}</span>
                        <span>Package: {text(row.packageId)}</span>
                        <span>Tracking: {text(row.trackingNumber)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Tracking details not available yet. Click <b>Refresh Daraz</b> first, then open this popup again.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}