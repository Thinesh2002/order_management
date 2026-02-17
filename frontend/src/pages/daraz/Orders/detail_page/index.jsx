import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../../../config/api";
import { motion } from "framer-motion";
import {
  ArrowLeft, Package, Phone, Copy, Check, 
  MapPin, CreditCard, Truck, 
  Tag, Info, Receipt, ChevronRight, Hash
} from "lucide-react";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await API.get("/daraz/all");
        const found = res.data.orders?.find(
          (o) => String(o.order_id) === String(orderId)
        );
        setOrder(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.order_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingState />;
  if (!order) return <NotFoundState navigate={navigate} />;

  return (
    <div className="p-4 lg:p-8 font-sans text-slate-800 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/daraz-orders")}
              className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors bg-white shadow-sm"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Daraz</span>
                <ChevronRight size={12} />
                <span className="text-blue-600">Order Management</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">#{order.order_id}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={copyOrderId} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black hover:border-blue-400 transition-all shadow-sm uppercase tracking-wider text-slate-600">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
              {copied ? "Copied" : "Copy ID"}
            </button>
            <StatusBadge status={order.statuses?.[0]} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: MAIN DETAILS & PRODUCTS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CORE INFO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <InfoCell label="Order Date" value={new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <InfoCell label="Waybill / No" value={order.order_number} />
              <InfoCell label="Store Name" value={order.account_name} />
              <InfoCell label="Item Count" value={`${order.items_count} Unit(s)`} />
            </div>

            {/* PRODUCT LIST SECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Package size={16} className="text-blue-600" /> Ordered Products
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {order.products?.map((item, index) => (
                  <div key={index} className="p-6 flex flex-col sm:flex-row gap-6 hover:bg-slate-50/50 transition-colors">
                    <div className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-white shadow-inner">
                      <img src={item.image} alt="product" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-[15px] font-bold text-slate-800 leading-snug line-clamp-2">{item.title}</h4>
                        <p className="text-base font-black text-blue-900 whitespace-nowrap italic">Rs {parseFloat(item.price).toLocaleString()}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200">SKU: {item.sku}</span>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md border border-blue-100">ID: {item.product_id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ADDRESSES */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase mb-5 flex items-center gap-2 tracking-widest">
                  <Truck size={14} className="text-blue-500" /> Shipping Destination
                </h3>
                <p className="text-sm font-black text-slate-800 mb-1">{order.address_shipping?.first_name} {order.address_shipping?.last_name}</p>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-4 font-medium">
                  {order.address_shipping?.address1}, {order.address_shipping?.city}<br />
                  {order.address_shipping?.address5}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                  <Phone size={14} /> {order.address_shipping?.phone}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase mb-5 flex items-center gap-2 tracking-widest">
                  <Receipt size={14} className="text-indigo-500" /> Billing Details
                </h3>
                <p className="text-sm font-black text-slate-800 mb-1">{order.address_billing?.first_name} {order.address_billing?.last_name}</p>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-4 font-medium">
                  {order.address_billing?.address1}, {order.address_billing?.city}<br />
                  {order.address_billing?.address3}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <MapPin size={14} className="text-slate-300" /> {order.address_billing?.country || "Sri Lanka"}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: FINANCIALS & LOGS (LIGHT THEME) */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em]">Payment Summary</h3>
              <div className="space-y-5">
                <PriceRow label="Original Shipping" value={order.shipping_fee_original} />
                <PriceRow label="Shipping Discount" value={order.shipping_fee_discount_seller} minus />
                <PriceRow label="Voucher Discount" value={order.voucher} minus />
                
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Payable</span>
                    <span className="text-3xl font-black text-blue-600 tracking-tighter italic">Rs {parseFloat(order.price).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</span>
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Paid</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <CreditCard size={18} className="text-slate-400" />
                  <span className="text-xs font-black uppercase tracking-tight text-slate-700">{order.payment_method || "COD"}</span>
                </div>
              </div>
            </div>

            {/* SYSTEM LOGS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
               <h3 className="text-[11px] font-black text-slate-400 uppercase mb-4 tracking-widest">Order Logs</h3>
               <div className="space-y-4">
                  <LogEntry label="Warehouse" value={order.warehouse_code || "Main Hub"} icon={<Hash size={12}/>} />
                  <LogEntry label="Last Update" value={new Date(order.updated_at).toLocaleString()} icon={<ClockIcon size={12}/>} />
                  <LogEntry label="Remarks" value={order.remarks || "No internal notes"} icon={<Info size={12}/>} />
               </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function InfoCell({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value || "—"}</p>
    </div>
  );
}

function PriceRow({ label, value, minus }) {
  return (
    <div className="flex justify-between items-center text-[13px]">
      <span className="text-slate-500 font-bold uppercase tracking-tight">{label}</span>
      <span className={`font-black ${minus ? 'text-rose-500' : 'text-slate-900'}`}>
        {minus ? '- ' : ''}Rs {parseFloat(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

function LogEntry({ label, value, icon }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-1 p-1.5 bg-slate-50 rounded-md text-slate-400">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none">{label}</p>
        <p className="text-[11px] font-bold text-slate-700 mt-1">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    shipped: "bg-blue-50 text-blue-600 border-blue-100",
    packed: "bg-amber-50 text-amber-600 border-amber-100",
    canceled: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return (
    <div className={`px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest ${styles[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {status?.replace(/_/g, ' ')}
    </div>
  );
}

function ClockIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      <p className="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading Order</p>
    </div>
  );
}

function NotFoundState({ navigate }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Package size={48} className="text-slate-200 mb-4" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Not Found</p>
      <button onClick={() => navigate("/daraz-orders")} className="mt-6 text-blue-600 font-bold text-sm hover:underline">Return to List</button>
    </div>
  );
}