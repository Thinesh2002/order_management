import Section from './Section.jsx';
import Info from './Info.jsx';
import { money, text } from '../../../utils/format';
import { openDarazDocument } from '../../../utils/darazDocument';

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeJson(value) {
  if (!value) return value;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getOrderData(payload) {
  const parsed = safeJson(payload);
  return parsed?.data || parsed?.result?.data || parsed || {};
}

function getLiveItems(payload) {
  const parsed = safeJson(payload);
  const data = parsed?.data || parsed?.result?.data || parsed;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.order_items)) return data.order_items;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function openCachedDocument(row) {
  const payload =
    safeJson(row?.response_json) ||
    safeJson(row?.response_body) ||
    safeJson(row?.payload) ||
    safeJson(row?.raw_payload) ||
    row;

  const opened = openDarazDocument(payload);

  if (!opened) {
    alert('Document file not found in cached data.');
  }
}

function CachedDocuments({ documents = [] }) {
  return (
    <Section
      title="AWB / Documents"
      right={<span className="text-xs text-slate-500">{documents.length} document(s)</span>}
    >
      {documents.length ? (
        <div className="table-wrap rounded-xl">
          <table className="om-table text-xs">
            <thead>
              <tr>
                <th>Type</th>
                <th>API</th>
                <th>Created</th>
                <th>Open</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc, index) => (
                <tr key={`${doc.id || index}-${doc.document_type || doc.doc_type || ''}`}>
                  <td>{text(doc.document_type || doc.doc_type || doc.type || 'AWB')}</td>
                  <td>{text(doc.api_name || doc.api_path || doc.endpoint)}</td>
                  <td>{text(doc.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-muted h-8 px-3 text-xs"
                      onClick={() => openCachedDocument(doc)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No cached AWB document found yet.
        </div>
      )}
    </Section>
  );
}

function ApiWarnings({ errors = [] }) {
  if (!errors.length) return null;

  return (
    <Section
      title="API warnings"
      right={<span className="text-xs text-red-600">{errors.length} issue(s)</span>}
    >
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div
            key={`${error.api || 'error'}-${index}`}
            className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700"
          >
            <p className="font-semibold">{text(error.api || 'API')}</p>
            <p>{text(error.message || error.error_msg)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function DarazApiPanel({ order }) {
  const live = order.daraz_live || {};
  const raw = order.raw_payload || order.daraz_order?.raw_payload;

  const liveOrder = getOrderData(live.live_order || raw);
  const liveItems = getLiveItems(live.live_items?.length ? live.live_items : order.items);
  const documents = toArray(order.daraz_cached?.documents);

  return (
    <details className="card overflow-hidden">
      <summary className="cursor-pointer border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900">
        Advanced Daraz details
        <span className="ml-2 text-xs font-normal text-slate-500">
          Click only when you need API reference details
        </span>
      </summary>

      <div className="space-y-4 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Daraz order reference">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Daraz Order ID" value={liveOrder.order_id} />
              <Info label="Order Number" value={liveOrder.order_number} />
              <Info label="Payment Method" value={liveOrder.payment_method} />
              <Info label="Warehouse" value={liveOrder.warehouse_code} />
              <Info label="Order Price" value={money(liveOrder.price, order.currency)} />
              <Info label="Shipping Fee" value={money(liveOrder.shipping_fee, order.currency)} />
              <Info label="COD Fee" value={money(liveOrder.cash_payment_fee, order.currency)} />
              <Info label="Updated At" value={liveOrder.updated_at} />
            </div>
          </Section>

          <CachedDocuments documents={documents} />
        </div>

        <Section title={`Daraz item references (${liveItems.length})`}>
          {liveItems.length ? (
            <div className="table-wrap rounded-xl">
              <table className="om-table text-xs">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Order Item ID</th>
                    <th>Package</th>
                    <th>Tracking</th>
                    <th>Status</th>
                    <th>SLA</th>
                  </tr>
                </thead>

                <tbody>
                  {liveItems.map((item, index) => (
                    <tr key={`${item.order_item_id || item.daraz_order_item_id || index}`}>
                      <td>{text(item.sku || item.seller_sku || item.local_sku)}</td>
                      <td>{text(item.order_item_id || item.daraz_order_item_id)}</td>
                      <td>{text(item.package_id)}</td>
                      <td>{text(item.tracking_code || item.tracking_number)}</td>
                      <td>
                        <span className="chip bg-blue-100 text-blue-700">
                          {text(item.status)}
                        </span>
                      </td>
                      <td>{text(item.fulfillment_sla)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No Daraz item references found.</p>
          )}
        </Section>

        <ApiWarnings errors={live.errors || []} />
      </div>
    </details>
  );
}