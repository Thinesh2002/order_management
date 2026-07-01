import { useEffect, useState } from 'react';
import { Package, Save } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { text } from '../utils/format';

export default function PackingMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ material_name: '', material_code: '', stock_qty: 0, reorder_level: 0, unit: 'pcs' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await orderApi.listMaterials();
      setMaterials(result.data || []);
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    try {
      await orderApi.saveMaterial(form);
      setForm({ material_name: '', material_code: '', stock_qty: 0, reorder_level: 0, unit: 'pcs' });
      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to save material');
    }
  }

  return (
    <section className="page-pad space-y-4">
      <div><h2 className="text-lg font-semibold text-slate-900">Packing Materials</h2><p className="text-sm text-slate-500">Manage boxes, labels, bubble wrap, tape, and other packing stock.</p></div>
      <form onSubmit={save} className="card grid gap-4 p-4 md:grid-cols-5">
        <label><span className="label">Material Name</span><input className="input" value={form.material_name} onChange={(e) => setForm((p) => ({ ...p, material_name: e.target.value }))} required /></label>
        <label><span className="label">Code</span><input className="input" value={form.material_code} onChange={(e) => setForm((p) => ({ ...p, material_code: e.target.value }))} /></label>
        <label><span className="label">Stock Qty</span><input className="input" type="number" value={form.stock_qty} onChange={(e) => setForm((p) => ({ ...p, stock_qty: e.target.value }))} /></label>
        <label><span className="label">Reorder Level</span><input className="input" type="number" value={form.reorder_level} onChange={(e) => setForm((p) => ({ ...p, reorder_level: e.target.value }))} /></label>
        <div className="flex items-end"><button className="btn-primary w-full"><Save size={16} /> Save</button></div>
      </form>
      <div className="table-wrap">
        <table className="om-table">
          <thead><tr><th>Material</th><th>Code</th><th>Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="5">Loading...</td></tr> : materials.length ? materials.map((item) => <tr key={item.id}><td><Package size={15} className="mr-2 inline" />{text(item.material_name)}</td><td>{text(item.material_code)}</td><td>{text(item.stock_qty, 0)} {text(item.unit, '')}</td><td>{text(item.reorder_level, 0)}</td><td><span className={`chip ${Number(item.stock_qty || 0) <= Number(item.reorder_level || 0) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{Number(item.stock_qty || 0) <= Number(item.reorder_level || 0) ? 'Low' : 'OK'}</span></td></tr>) : <tr><td colSpan="5">No materials found.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}
