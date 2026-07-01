import { useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { niceDate, text } from '../utils/format';

function flattenLogs(data) {
  const rows = [];
  for (const [group, list] of Object.entries(data || {})) {
    if (!Array.isArray(list)) continue;
    list.forEach((item) => rows.push({ group, ...item }));
  }
  return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await orderApi.logs({ type, limit: 100 });
      setLogs(flattenLogs(result.data || {}));
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [type]);

  return (
    <section className="page-pad space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">Logs</h2><p className="text-sm text-slate-500">Logs read from existing log management database.</p></div>
        <select className="input w-56" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All Logs</option><option value="system">System</option><option value="order">Order</option><option value="sync">Sync</option><option value="daraz">Daraz API</option><option value="trans_express">Trans Express</option><option value="inventory">Inventory</option></select>
      </div>
      <div className="table-wrap">
        <table className="om-table">
          <thead><tr><th>Time</th><th>Type</th><th>Action</th><th>Message</th><th>Reference</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="5">Loading...</td></tr> : logs.length ? logs.map((log, index) => (
              <tr key={`${log.group}-${log.id || index}`}><td>{niceDate(log.created_at)}</td><td><span className="chip bg-slate-100 text-slate-700">{text(log.group).replace(/_/g, ' ')}</span></td><td>{text(log.action || log.event_type || log.api_path || log.log_level)}</td><td>{text(log.message || log.note || log.description || log.error_message)}</td><td>{text(log.order_no || log.reference_id || log.source_order_id || log.account_code || log.sku)}</td></tr>
            )) : <tr><td colSpan="5">No logs found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
