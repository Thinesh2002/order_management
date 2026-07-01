import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { niceDate, text } from '../utils/format';

export default function TrackingPage() {
  const { trackingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await orderApi.getTracking(trackingId);
      setData(result.data);
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Tracking load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [trackingId]);

  if (loading && !data) return <div className="flex h-60 items-center justify-center text-sm text-slate-500">Loading tracking...</div>;
  if (!data) return <div className="flex h-60 items-center justify-center text-sm text-slate-500">Tracking not found.</div>;

  return (
    <section className="page-pad space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/order-management" className="icon-btn"><ArrowLeft size={16} /></Link>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tracking Details</h2>
          <p className="text-sm text-slate-500">{text(data.waybill?.waybill_id)} · {text(data.waybill?.courier_status)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Waybill ID', data.waybill?.waybill_id],
          ['Order No', data.waybill?.source_order_no],
          ['Receiver', data.waybill?.receiver_name],
          ['Last Checked', niceDate(data.waybill?.last_tracking_checked_at)],
        ].map(([label, value]) => (
          <div className="card p-4" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{text(value)}</p></div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Tracking process</h3>
        {(data.events || []).length ? data.events.map((event) => (
          <div className="relative border-l border-slate-200 pb-5 pl-5" key={event.id}>
            <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-brand" />
            <p className="text-sm font-semibold text-slate-900">{text(event.tracking_status)}</p>
            <p className="mt-1 text-sm text-slate-600">{text(event.tracking_description)}</p>
            <p className="mt-1 text-xs text-slate-500">{text(event.tracking_location)} · {niceDate(event.event_time)}</p>
          </div>
        )) : <p className="text-sm text-slate-500">No tracking events yet.</p>}
      </div>
    </section>
  );
}
