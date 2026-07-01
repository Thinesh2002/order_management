import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { niceDate, text } from '../utils/format';

const labels = { DARAZ: 'Daraz Orders', WOO: 'WooCommerce Orders' };

function defaultRow(platform) {
  return { platform_code: platform, sync_enabled: 1, auto_sync_enabled: 1, sync_interval_minutes: 5, fetch_order_days: 7, last_sync_status: 'never' };
}

export default function SyncSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [syncing, setSyncing] = useState('');
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);

  const rows = useMemo(() => {
    const map = new Map(settings.map((row) => [String(row.platform_code).toUpperCase(), row]));
    return ['DARAZ', 'WOO'].map((platform) => ({ ...defaultRow(platform), ...(map.get(platform) || {}) }));
  }, [settings]);

  async function load() {
    setLoading(true);
    try {
      const result = await orderApi.syncSettings();
      setSettings(result.data || []);
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

  async function runSync(platform) {
    setSyncing(platform);
    try {
      if (platform === 'DARAZ') await orderApi.syncDaraz();
      else if (platform === 'WOO') await orderApi.syncWoo();
      else await orderApi.syncAll();
      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Sync failed');
    } finally {
      setSyncing('');
    }
  }

  return (
    <section className="page-pad space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Order Sync Settings</h2>
          <p className="text-sm text-slate-500">Daraz and Woo orders auto-sync every 5 minutes when enabled.</p>
        </div>
        <button className="btn-primary" onClick={() => runSync('ALL')} disabled={Boolean(syncing)}><RotateCcw size={16} /> {syncing === 'ALL' ? 'Syncing...' : 'Sync All Now'}</button>
      </div>

      {loading ? <div className="card p-6 text-sm text-slate-500">Loading sync settings...</div> : rows.map((row) => (
        <div className="card p-5" key={row.platform_code}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{labels[row.platform_code]}</h3>
              <p className="text-sm text-slate-500">Last status: <span className="font-medium text-slate-800">{text(row.last_sync_status)}</span></p>
            </div>
            <span className="chip bg-slate-100 text-slate-700">{text(row.last_sync_status)}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label><span className="label">Sync Enabled</span><select className="input" value={Number(row.sync_enabled)} onChange={(e) => update(row.platform_code, 'sync_enabled', Number(e.target.value))}><option value={1}>Yes</option><option value={0}>No</option></select></label>
            <label><span className="label">Auto Sync</span><select className="input" value={Number(row.auto_sync_enabled)} onChange={(e) => update(row.platform_code, 'auto_sync_enabled', Number(e.target.value))}><option value={1}>Every 5 minutes</option><option value={0}>Manual only</option></select></label>
            <label><span className="label">Fetch Days Back</span><input className="input" type="number" min="1" max="3650" value={row.fetch_order_days || 7} onChange={(e) => update(row.platform_code, 'fetch_order_days', e.target.value)} /></label>
            <label><span className="label">Interval Minutes</span><input className="input" type="number" min="5" value={row.sync_interval_minutes || 5} onChange={(e) => update(row.platform_code, 'sync_interval_minutes', e.target.value)} /></label>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-3"><span>Started: {niceDate(row.last_sync_started_at)}</span><span>Finished: {niceDate(row.last_sync_finished_at)}</span><span>Next: {niceDate(row.next_sync_at)}</span></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-muted" onClick={() => save(row)} disabled={saving === row.platform_code}><Save size={15} /> Save</button>
            <button className="btn-primary" onClick={() => runSync(row.platform_code)} disabled={Boolean(syncing)}><RotateCcw size={15} /> {syncing === row.platform_code ? 'Syncing...' : `Sync ${row.platform_code} Now`}</button>
          </div>
        </div>
      ))}
    </section>
  );
}
