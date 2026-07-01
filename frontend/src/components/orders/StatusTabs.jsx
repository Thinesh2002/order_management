import { STATUS_TABS } from '../../utils/orderHelpers';

export default function StatusTabs({ status, setStatus, counts }) {
  return (
    <div className="sticky top-16 z-40 border-b border-slate-300 bg-white shadow-sm">
      <div className="flex min-w-0 flex-wrap items-end gap-0 px-0SS pt-0">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`group relative flex h-10 cursor-pointer items-center gap-1   px-5 text-sm font-medium transition-all duration-150 ${
                active
                  ? 'z-10 border-slate-300 bg-white text-slate-900'
                  : 'border-slate-300 bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-900'
              }`}
            >
              {!active ? (
                <span className="pointer-events-none absolute inset-0  bg-slate-400/20 transition group-hover:bg-slate-500/20" />
              ) : null}

              <span className="relative z-10 whitespace-nowrap">
                {tab.label}
              </span>

              <span
                className={`relative z-10 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  active
                    ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {counts?.[tab.key] ?? 0}
              </span>

              {active ? (
                <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-red-500" />
              ) : (
                <span className="absolute inset-x-2 bottom-0 h-px rounded-full bg-slate-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}