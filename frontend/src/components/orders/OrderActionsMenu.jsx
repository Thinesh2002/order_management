import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  STATUS_TABS,
  canDarazPack,
  canDarazPrintAwb,
  canDarazReady,
} from '../../utils/orderHelpers';

const FALLBACK_STATUS_TABS = [
  { key: 'New', label: 'New' },
  { key: 'To Pack', label: 'To Pack' },
  { key: 'To Arrange Shipment', label: 'To Arrange Shipment' },
  { key: 'Ready To Ship', label: 'Ready To Ship' },
  { key: 'Shipped', label: 'Shipped' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
  { key: 'Returned', label: 'Returned' },
];

function isManualOrder(order) {
  const source = String(order?.source || order?.order_source || '').toLowerCase();
  const marketplace = String(order?.marketplace || '').toLowerCase();

  return (
    source === 'manual' ||
    source.startsWith('manual_') ||
    marketplace === 'manual' ||
    marketplace.startsWith('manual_')
  );
}

function getCurrentStatus(order) {
  return String(order?.status || order?.order_status || '').trim();
}

export default function OrderActionsMenu({
  order,
  onCreateWaybill,
  onStatusChange,
  onDarazAction,
  busy,
}) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const run = (fn) => {
    if (typeof fn === 'function') {
      fn();
    }
    close();
  };

  const manualOrder = isManualOrder(order);
  const currentStatus = getCurrentStatus(order);

  const manualStatuses = useMemo(() => {
    const sourceTabs = Array.isArray(STATUS_TABS) && STATUS_TABS.length
      ? STATUS_TABS
      : FALLBACK_STATUS_TABS;

    const cleanTabs = sourceTabs
      .filter((tab) => tab?.key)
      .map((tab) => ({
        key: tab.key,
        label: tab.label || tab.key,
      }));

    return cleanTabs.length ? cleanTabs : FALLBACK_STATUS_TABS;
  }, []);

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        onClick={() => setOpen((value) => !value)}
        aria-label="Order actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {open ? (
        <div className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <Link
            className="block cursor-pointer px-3 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            target="_blank"
            rel="noopener noreferrer"
            to={`/order-management/orders/${order.source}/${order.source_order_id}`}
            onClick={close}
          >
            View details
          </Link>

          <Link
            className="block cursor-pointer px-3 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            target="_blank"
            rel="noopener noreferrer"
            to={`/order-management/orders/${order.source}/${order.source_order_id}?print=1`}
            onClick={close}
          >
            Print invoice
          </Link>

          {order.waybill_id || order.tracking_number ? (
            <Link
              className="block cursor-pointer px-3 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              target="_blank"
              rel="noopener noreferrer"
              to={`/order-management/tracking/${order.waybill_id || order.tracking_number}`}
              onClick={close}
            >
              Tracking
            </Link>
          ) : null}

          {manualOrder ? (
            <>
              <div className="my-1 border-t border-slate-100" />

              <button
                className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                type="button"
                onClick={() => run(() => onCreateWaybill(order))}
              >
                Add waybill
              </button>

              <div className="my-1 border-t border-slate-100" />

              <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Change Status
              </p>

              {manualStatuses.map((tab) => {
                const isCurrent =
                  currentStatus.toLowerCase() === String(tab.key).toLowerCase();

                return (
                  <button
                    key={tab.key}
                    className={`block w-full px-3 py-2 text-left text-sm font-normal transition ${
                      isCurrent
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                    type="button"
                    disabled={isCurrent || busy}
                    onClick={() => run(() => onStatusChange(order, tab.key))}
                  >
                    {isCurrent ? `Current: ${tab.label}` : `Mark ${tab.label}`}
                  </button>
                );
              })}
            </>
          ) : null}

          {canDarazPack(order) || canDarazReady(order) || canDarazPrintAwb(order) ? (
            <>
              <div className="my-1 border-t border-slate-100" />

              <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Daraz Actions
              </p>
            </>
          ) : null}

          {canDarazPack(order) ? (
            <button
              className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              type="button"
              onClick={() => run(() => onDarazAction('pack', [order.source_order_id]))}
            >
              Pack
            </button>
          ) : null}

          {canDarazReady(order) ? (
            <button
              className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              type="button"
              onClick={() => run(() => onDarazAction('ready_to_ship', [order.source_order_id]))}
            >
              Ready To Ship
            </button>
          ) : null}

          {canDarazPrintAwb(order) ? (
            <button
              className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-normal text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              type="button"
              onClick={() => run(() => onDarazAction('print_awb', [order.source_order_id]))}
            >
              Print AWB
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}