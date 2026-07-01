import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import Field from '../components/forms/Field.jsx';
import LineItemsEditor from '../components/forms/LineItemsEditor.jsx';
import { money } from '../utils/format';

const accountOptions = ['BrightHub', 'BrightMart', 'Value Store'];

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function emptyItem() {
  return {
    sku: '',
    product_title: '',
    qty: 1,
    unit_price: '0.00',
    discount_amount: '0.00',
    product_image_url: '',
    product_id: null,
    variant_id: null,
    available_qty: null,
    lookup_status: '',
  };
}

function lineTotal(item) {
  return Math.max(Number(item.qty || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0), 0);
}

export default function CreateManualOrderPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [skuLoadingIndex, setSkuLoadingIndex] = useState(null);
  const [form, setForm] = useState({
    source_type: 'MANUAL_WHATSAPP',
    account_name: 'BrightHub',
    order_date: todayInputValue(),
    customer: { customer_name: '', company_name: '', phone_1: '', phone_2: '', email: '' },
    shipping: {
      shipping_address_line1: '',
      shipping_address_line2: '',
      shipping_city: '',
      shipping_district: '',
      shipping_province: '',
      shipping_postal_code: '',
      shipping_country: 'Sri Lanka',
    },
    items: [emptyItem()],
    currency: 'LKR',
    discount_total: '0.00',
    shipping_fee: '0.00',
    tax_percentage: '0',
    payment_method: 'COD',
    customer_note: '',
  });

  const itemTotal = useMemo(() => form.items.reduce((sum, item) => sum + lineTotal(item), 0), [form.items]);
  const taxTotal = useMemo(() => itemTotal * (Number(form.tax_percentage || 0) / 100), [itemTotal, form.tax_percentage]);
  const orderTotal = useMemo(() => itemTotal - Number(form.discount_total || 0) + Number(form.shipping_fee || 0) + taxTotal, [itemTotal, form.discount_total, form.shipping_fee, taxTotal]);

  const setRoot = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setNested = (section, key, value) => setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  const updateItem = (index, key, value) => setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (index) => setForm((prev) => ({ ...prev, items: prev.items.length === 1 ? prev.items : prev.items.filter((_, i) => i !== index) }));

  async function loadSku(index) {
    const sku = form.items[index]?.sku?.trim();
    if (!sku) return;
    setSkuLoadingIndex(index);
    updateItem(index, 'lookup_status', 'Checking SKU...');
    try {
      const result = await orderApi.productBySku(sku);
      const product = result.data || result.product || result;
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => i === index ? {
          ...item,
          product_title: product.product_title || product.title || product.product_name || item.product_title,
          unit_price: product.selling_price || product.price || product.unit_price || item.unit_price,
          product_image_url: product.product_image_url || product.image_url || product.main_image_url || item.product_image_url,
          product_id: product.product_id || product.id || item.product_id,
          variant_id: product.variant_id || item.variant_id,
          available_qty: product.available_qty ?? product.stock_qty ?? item.available_qty,
          lookup_status: 'SKU matched',
        } : item),
      }));
    } catch {
      updateItem(index, 'lookup_status', 'SKU not found');
    } finally {
      setSkuLoadingIndex(null);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.customer.phone_1.trim()) {
      alert('Phone number 1 is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, totals: { item_total: itemTotal, tax_total: taxTotal, order_total: orderTotal } };
      await orderApi.createManualOrder(payload);
      navigate('/order-management');
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Order create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="page-pad space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/order-management" className="icon-btn"><ArrowLeft size={16} /></Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create Manual Order</h2>
            <p className="text-sm text-slate-500">Order number will be created automatically as BH0001, BH0002, BH0003.</p>
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Create Order'}</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Customer details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Customer Name" required><input className="input" value={form.customer.customer_name} onChange={(e) => setNested('customer', 'customer_name', e.target.value)} required /></Field>
            <Field label="Company"><input className="input" value={form.customer.company_name} onChange={(e) => setNested('customer', 'company_name', e.target.value)} /></Field>
            <Field label="Phone Number 1" required><input className="input" value={form.customer.phone_1} onChange={(e) => setNested('customer', 'phone_1', e.target.value)} required /></Field>
            <Field label="Phone Number 2"><input className="input" value={form.customer.phone_2} onChange={(e) => setNested('customer', 'phone_2', e.target.value)} /></Field>
            <Field label="Email"><input className="input" type="email" value={form.customer.email} onChange={(e) => setNested('customer', 'email', e.target.value)} /></Field>
            <Field label="Payment Method"><select className="input" value={form.payment_method} onChange={(e) => setRoot('payment_method', e.target.value)}><option value="COD">COD</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option><option value="Paid">Paid</option></select></Field>
          </div>
        </section>

        <section className="card p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Order source</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Order Type"><select className="input" value={form.source_type} onChange={(e) => setRoot('source_type', e.target.value)}><option value="MANUAL_WHATSAPP">Manual WhatsApp</option><option value="MANUAL_FACEBOOK">Manual Facebook</option><option value="MANUAL_TIKTOK">Manual TikTok</option><option value="MANUAL_OTHER">Manual Other</option></select></Field>
            <Field label="Account Name" required><input className="input" list="account-options" value={form.account_name} onChange={(e) => setRoot('account_name', e.target.value)} required /><datalist id="account-options">{accountOptions.map((value) => <option key={value} value={value} />)}</datalist></Field>
            <Field label="Order Date" required><input className="input" type="date" value={form.order_date} onChange={(e) => setRoot('order_date', e.target.value)} required /></Field>
            <Field label="Currency"><input className="input bg-slate-100" value="Rs" readOnly /></Field>
          </div>
        </section>
      </div>

      <section className="card p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Shipping address</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Address Line 1" required><input className="input" value={form.shipping.shipping_address_line1} onChange={(e) => setNested('shipping', 'shipping_address_line1', e.target.value)} required /></Field>
          <Field label="Address Line 2"><input className="input" value={form.shipping.shipping_address_line2} onChange={(e) => setNested('shipping', 'shipping_address_line2', e.target.value)} /></Field>
          <Field label="City" required><input className="input" value={form.shipping.shipping_city} onChange={(e) => setNested('shipping', 'shipping_city', e.target.value)} required /></Field>
          <Field label="District"><input className="input" value={form.shipping.shipping_district} onChange={(e) => setNested('shipping', 'shipping_district', e.target.value)} /></Field>
          <Field label="Province"><input className="input" value={form.shipping.shipping_province} onChange={(e) => setNested('shipping', 'shipping_province', e.target.value)} /></Field>
          <Field label="Postcode"><input className="input" value={form.shipping.shipping_postal_code} onChange={(e) => setNested('shipping', 'shipping_postal_code', e.target.value)} /></Field>
          <Field label="Country"><input className="input bg-slate-100" value="Sri Lanka" readOnly /></Field>
        </div>
      </section>

      <LineItemsEditor items={form.items} updateItem={updateItem} addItem={addItem} removeItem={removeItem} onSkuBlur={loadSku} loadingIndex={skuLoadingIndex} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="card p-4">
          <Field label="Customer Note"><textarea className="textarea" value={form.customer_note} onChange={(e) => setRoot('customer_note', e.target.value)} placeholder="Friendly note for customer or internal team" /></Field>
        </section>
        <section className="card p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Line item total</span><strong>{money(itemTotal, 'Rs')}</strong></div>
            <Field label="Discount"><input className="input" type="number" min="0" step="0.01" value={form.discount_total} onChange={(e) => setRoot('discount_total', e.target.value)} /></Field>
            <Field label="Shipping Paid"><input className="input" type="number" min="0" step="0.01" value={form.shipping_fee} onChange={(e) => setRoot('shipping_fee', e.target.value)} /></Field>
            <Field label="Tax Percentage"><input className="input" type="number" min="0" step="0.01" value={form.tax_percentage} onChange={(e) => setRoot('tax_percentage', e.target.value)} /></Field>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base"><span className="font-medium text-slate-700">Order Total</span><strong className="text-brand">{money(orderTotal, 'Rs')}</strong></div>
          </div>
        </section>
      </div>
    </form>
  );
}
