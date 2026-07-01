import { useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { niceDate, text } from '../utils/format';

export default function AccountStatusPage() {
  const [data, setData] = useState({ accounts: [], summary: {} });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await orderApi.accountStatus();
      setData(result.data || { accounts: [], summary: {} });
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to load account status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="page-pad space-y-4">
      <div><h2 className="text-lg font-semibold text-slate-900">Marketplace Account Status</h2><p className="text-sm text-slate-500">Connected with existing marketplace management accounts.</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(data.summary || {}).map(([platform, item]) => <div className="card p-4" key={platform}><p className="text-xs text-slate-500">{platform}</p><p className="mt-1 text-2xl font-semibold text-brand">{item.connected}/{item.total}</p><p className="text-xs text-slate-500">Connected accounts</p></div>)}
      </div>
      <div className="table-wrap">
        <table className="om-table">
          <thead><tr><th>Marketplace</th><th>Account</th><th>Status</th><th>Connection</th><th>Last Order Sync</th><th>Last Error</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="6">Loading...</td></tr> : data.accounts?.length ? data.accounts.map((account) => <tr key={`${account.platform_code}-${account.account_id}`}><td><span className="chip bg-slate-100 text-slate-700">{text(account.platform_code)}</span></td><td>{text(account.account_name)}<div className="text-xs text-slate-500">{text(account.account_code)}</div></td><td>{text(account.status)}</td><td><span className="chip bg-emerald-100 text-emerald-700">{text(account.connection_status)}</span></td><td>{niceDate(account.last_sync_at)}</td><td>{text(account.last_error)}</td></tr>) : <tr><td colSpan="6">No marketplace accounts found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
