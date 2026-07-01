import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Save } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { niceDate, text } from '../utils/format';

const labels = { DARAZ: 'Daraz Orders', WOO: 'WooCommerce Orders' };

function defaultRow(platform) {
  return {
    platform_code: platform,
    sync_enabled: 1,
    auto_sync_enabled: 1,
    sync_interval_minutes: 5,
    fetch_order_days: 7,
    last_sync_status: 'never',
  };
}

function todayInput(daysBack = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function flattenSyncLogs(data) {
  const rows = [];
  for (const [group, list] of Object.entries(data || {})) {
    if (!Array.isArray(list)) continue;
    list.forEach((item) => rows.push({ group, ...item }));
  }
  return rows.sort((a, b) => new Date(b.created_at || b.started_at || 0) - new Date(a.created_at || a.started_at || 0));
}

function statusChip(status) {
  const value = String(status || 'never').toLowerCase();
  if (value === 'success') return 'bg-emerald-100 text-emerald-700';
  if (value === 'partial' || value === 'running') return 'bg-amber-100 text-amber-700';
  if (value === 'failed' || value === 'error') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export default function SyncSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [syncing, setSyncing] = useState('');
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncForm, setSyncForm] = useState({
    days: 7,
    date_from: todayInput(7),
    date_to: todayInput(0),
    limit: 50,
    max_pages: 5,
  });

  const rows = useMemo(() => {
    const map = new Map(settings.map((row) => [String(row.platform_code).toUpperCase(), row]));
    return ['DARAZ', 'WOO'].map((platform) => ({ ...defaultRow(platform), ...(map.get(platform) || {}) }));
  }, [settings]);

  const marketplaceAccounts = useMemo(
    () => accounts.filter((account) => ['DARAZ', 'WOO'].includes(String(account.platform_code || '').toUpperCase())),
    [accounts]
  );

  async function load() {
    setLoading(true);
    try {
      const [settingsResult, accountsResult, logsResult] = await Promise.all([
        orderApi.syncSettings(),
        orderApi.accountStatus().catch(() => ({ data: { accounts: [] } })),
        orderApi.logs({ type: 'sync', limit: 50 }).catch(() => ({ data: {} })),
      ]);
      setSettings(settingsResult.data || []);
      setAccounts(accountsResult.data?.accounts || []);
      setLogs(flattenSyncLogs(logsResult.data || {}));
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to load sync settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(platform, key, value) {
    setSettings((prev) => {
      const exists = prev.some((row) => String(row.platform_code).toUpperCase() === platform);
      if (!exists) return [...prev, { ...defaultRow(platform), [key]: value }];
      return prev.map((row) => String(row.platform_code).toUpperCase() === platform ? { ...row, [key]: value } : row);
    });
  }

  function updateSyncForm(key, value) {
    setSyncForm((prev) => ({ ...prev, [key]: value }));
  }

  function syncPayload(account = null) {
    const payload = {
      days: Number(syncForm.days || 7),
      limit: Number(syncForm.limit || 50),
      max_pages: Number(syncForm.max_pages || 5),
      date_from: syncForm.date_from || undefined,
      date_to: syncForm.date_to || undefined,
    };
    if (account?.account_id) payload.account_id = account.account_id;
    return payload;
  }

  async function save(row) {
    setSaving(row.platform_code);
    try {
      await orderApi.updateSyncSetting(row.platform_code, row);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to save sync setting');
    } finally {
      setSaving('');
    }
  }

  async function runSync(platform, account = null) {
    const key = account ? `${platform}-${account.account_id}` : platform;
    setSyncing(key);
    try {
      let result;
      const payload = syncPayload(account);
      if (platform === 'DARAZ') result = await orderApi.syncDaraz(payload);
      else if (platform === 'WOO') result = await orderApi.syncWoo(payload);
      else result = await orderApi.syncAll(payload);
      setLastResult(result.data || result);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Sync failed');
    } finally {
      setSyncing('');
    }
  }

  const lastResultAccounts = useMemo(() => {
    if (!lastResult) return [];
    if (Array.isArray(lastResult.accounts)) return lastResult.accounts.map((row) => ({ platform: lastResult.platform, ...row }));
    return [
      ...(lastResult.daraz?.accounts || []).map((row) => ({ platform: 'DARAZ', ...row })),
      ...(lastResult.woo?.accounts || []).map((row) => ({ platform: 'WOO', ...row })),
    ];
  }, [lastResult]);

  return (
    <section className="page-pad space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Order Sync Settings</h2>
          <p className="text-sm text-slate-500">Sync each Daraz/Woo account separately with date range, days, limit and visible run logs.</p>
        </div>
        <button className="btn-primary" onClick={() => runSync('ALL')} disabled={Boolean(syncing)}>
          <RotateCcw size={16} /> {syncing === 'ALL' ? 'Syncing...' : 'Sync All Accounts'}
        </button>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <RotateCcw size={16} /> Manual Sync Range
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <label><span className="label">Days to sync</span><input className="input" type="number" min="1" max="3650" value={syncForm.days} onChange={(e) => updateSyncForm('days', e.target.value)} /></label>
          <label><span className="label">Date From</span><input className="input" type="date" value={syncForm.date_from} onChange={(e) => updateSyncForm('date_from', e.target.value)} /></label>
          <label><span className="label">Date To</span><input className="input" type="date" value={syncForm.date_to} onChange={(e) => updateSyncForm('date_to', e.target.value)} /></label>
          <label><span className="label">Per Page Limit</span><input className="input" type="number" min="1" max="100" value={syncForm.limit} onChange={(e) => updateSyncForm('limit', e.target.value)} /></label>
          <label><span className="label">Max Pages</span><input className="input" type="number" min="1" max="100" value={syncForm.max_pages} onChange={(e) => updateSyncForm('max_pages', e.target.value)} /></label>
        </div>
        <p className="mt-3 text-xs text-slate-500">Example: 7 days + limit 50 + max pages 5 can fetch up to 250 orders per account.</p>
      </div>

      {loading ? <div className="card p-6 text-sm text-slate-500">Loading sync settings...</div> : rows.map((row) => (
        <div className="card p-5" key={row.platform_code}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{labels[row.platform_code]}</h3>
              <p className="text-sm text-slate-500">Last status: <span className="font-medium text-slate-800">{text(row.last_sync_status)}</span></p>
            </div>
            <span className={`chip ${statusChip(row.last_sync_status)}`}>{text(row.last_sync_status)}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label><span className="label">Sync Enabled</span><select className="input" value={Number(row.sync_enabled)} onChange={(e) => update(row.platform_code, 'sync_enabled', Number(e.target.value))}><option value={1}>Yes</option><option value={0}>No</option></select></label>
            <label><span className="label">Auto Sync</span><select className="input" value={Number(row.auto_sync_enabled)} onChange={(e) => update(row.platform_code, 'auto_sync_enabled', Number(e.target.value))}><option value={1}>Every interval</option><option value={0}>Manual only</option></select></label>
            <label><span className="label">Default Fetch Days</span><input className="input" type="number" min="1" max="3650" value={row.fetch_order_days || 7} onChange={(e) => update(row.platform_code, 'fetch_order_days', e.target.value)} /></label>
            <label><span className="label">Interval Minutes</span><input className="input" type="number" min="5" value={row.sync_interval_minutes || 5} onChange={(e) => update(row.platform_code, 'sync_interval_minutes', e.target.value)} /></label>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-4">
            <span>Started: {niceDate(row.last_sync_started_at)}</span>
            <span>Finished: {niceDate(row.last_sync_finished_at)}</span>
            <span>Next: {niceDate(row.next_sync_at)}</span>
            <span>Error: {text(row.last_error_message || row.last_sync_message)}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-muted" onClick={() => save(row)} disabled={saving === row.platform_code}><Save size={15} /> Save</button>
            <button className="btn-primary" onClick={() => runSync(row.platform_code)} disabled={Boolean(syncing)}><RotateCcw size={15} /> {syncing === row.platform_code ? 'Syncing...' : `Sync All ${row.platform_code}`}</button>
          </div>
        </div>
      ))}

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Account-wise Sync</h3>
            <p className="text-sm text-slate-500">Each account can be synced separately and confirmed against order table saved count.</p>
          </div>
          <span className="chip bg-slate-100 text-slate-700">{marketplaceAccounts.length} accounts</span>
        </div>
        <div className="table-wrap">
          <table className="om-table">
            <thead><tr><th>Marketplace</th><th>Account</th><th>Credential</th><th>Last Sync</th><th>Last Error</th><th>Action</th></tr></thead>
            <tbody>
              {marketplaceAccounts.length ? marketplaceAccounts.map((account) => {
                const platform = String(account.platform_code || '').toUpperCase();
                const key = `${platform}-${account.account_id}`;
                return (
                  <tr key={key}>
                    <td><span className="chip bg-slate-100 text-slate-700">{platform}</span></td>
                    <td>{text(account.account_name)}<div className="text-xs text-slate-500">{text(account.account_code)}</div></td>
                    <td>{account.credential_ready ? <span className="chip bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Ready</span> : <span className="chip bg-red-100 text-red-700"><AlertTriangle size={12} /> Missing</span>}</td>
                    <td>{niceDate(account.last_sync_at)}</td>
                    <td>{text(account.last_error)}</td>
                    <td><button className="btn-primary" onClick={() => runSync(platform, account)} disabled={Boolean(syncing)}><RotateCcw size={15} /> {syncing === key ? 'Syncing...' : 'Sync This Account'}</button></td>
                  </tr>
                );
              }) : <tr><td colSpan="6">No active Daraz/Woo accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {lastResultAccounts.length ? (
        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Last Sync Confirmation</h3>
          <div className="table-wrap">
            <table className="om-table">
              <thead><tr><th>Platform</th><th>Account</th><th>Fetched</th><th>Saved</th><th>Inserted</th><th>Updated</th><th>Items</th><th>Order Table Confirmed</th><th>Errors</th></tr></thead>
              <tbody>
                {lastResultAccounts.map((row, index) => (
                  <tr key={`${row.platform}-${row.account_id}-${index}`}>
                    <td><span className="chip bg-slate-100 text-slate-700">{text(row.platform)}</span></td>
                    <td>{text(row.account_name)}<div className="text-xs text-slate-500">{text(row.account_code)}</div></td>
                    <td>{row.fetched || 0}</td>
                    <td>{row.saved || 0}</td>
                    <td>{row.inserted || 0}</td>
                    <td>{row.updated || 0}</td>
                    <td>{row.items_saved || 0}</td>
                    <td><span className="chip bg-emerald-100 text-emerald-700">{row.confirmed_orders || 0}</span></td>
                    <td>{Array.isArray(row.errors) && row.errors.length ? row.errors.join(', ') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Recent Sync Logs</h3>
        <div className="table-wrap">
          <table className="om-table">
            <thead><tr><th>Time</th><th>Type</th><th>Account</th><th>Status</th><th>Fetched</th><th>Saved</th><th>Confirmed</th><th>Error</th></tr></thead>
            <tbody>
              {logs.length ? logs.slice(0, 20).map((log, index) => (
                <tr key={`${log.group}-${log.id || index}`}>
                  <td>{niceDate(log.created_at || log.started_at)}</td>
                  <td>{text(log.group).replace(/_/g, ' ')}</td>
                  <td>{text(log.account_name || log.account_code)}</td>
                  <td><span className={`chip ${statusChip(log.status || log.last_sync_status)}`}>{text(log.status || log.last_sync_status)}</span></td>
                  <td>{log.fetched_orders || 0}</td>
                  <td>{log.saved_orders || 0}</td>
                  <td>{log.confirmed_orders || 0}</td>
                  <td>{text(log.error_message)}</td>
                </tr>
              )) : <tr><td colSpan="8">No sync logs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
