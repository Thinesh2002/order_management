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
    <div className="  p-6 lg:p-5 font-sans text-slate-800">
      <div className="">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/daraz-orders")}
              className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
            >
              <ArrowLeft size={16} className="text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                <span>Orders</span>
                <ChevronRight size={12} />
                <span className="text-blue-600">Details</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-0.5">Order #{order.order_id}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={copyOrderId} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-md text-[11px] font-bold hover:bg-slate-50 transition-all">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
              {copied ? "COPIED" : "COPY ID"}
            </button>
            <StatusDot status={order.statuses?.[0]} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: MAIN DETAILS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CORE INFO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-xl p-6">
              <InfoCell label="Created At" value={new Date(order.created_at).toLocaleDateString()} />
              <InfoCell label="Waybill" value={order.order_number} />
              <InfoCell label="Store" value={order.account_name} />
              <InfoCell label="Quantity" value={`${order.items_count} Item(s)`} />
            </div>

            {/* ADDRESSES */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Truck size={14} /> Shipping
                </h3>
                <p className="text-sm font-bold mb-1">{order.address_shipping?.first_name} {order.address_shipping?.last_name}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {order.address_shipping?.address1}, {order.address_shipping?.city}<br />
                  {order.address_shipping?.country}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Phone size={12} className="text-slate-400" /> {order.address_shipping?.phone}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Receipt size={14} /> Billing
                </h3>
                <p className="text-sm font-bold mb-1">{order.address_billing?.first_name} {order.address_billing?.last_name}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {order.address_billing?.address1}, {order.address_billing?.city}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Phone size={12} className="text-slate-400" /> {order.address_billing?.phone}
                </div>
              </div>
            </div>

            {/* DISCOUNTS */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-wrap gap-12">
              <InfoCell label="Voucher" value={order.voucher_code || "None"} />
              <InfoCell label="Seller Disc." value={`Rs ${order.voucher_seller}`} />
              <InfoCell label="Platform Disc." value={`Rs ${order.voucher_platform}`} />
            </div>
          </div>

          {/* RIGHT: FINANCIALS */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase mb-6">Payment Summary</h3>
              <div className="space-y-4">
                <PriceRow label="Subtotal Shipping" value={order.shipping_fee_original} />
                <PriceRow label="Shipping Discount" value={order.shipping_fee_discount_seller} minus />
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold">Total Amount</span>
                  <span className="text-lg font-black text-blue-600">Rs {parseFloat(order.price).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{order.payment_method}</span>
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase">Paid</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                Warehouse ID: <span className="font-bold">{order.warehouse_code || "G-001"}</span><br />
                System log recorded on {new Date(order.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- MINIMAL COMPONENTS ---

function InfoCell({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] font-bold text-slate-800">{value || "—"}</p>
    </div>
  );
}

function PriceRow({ label, value, minus }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`font-bold ${minus ? 'text-rose-500' : 'text-slate-800'}`}>
        {minus ? '- ' : ''}Rs {parseFloat(value).toLocaleString()}
      </span>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    delivered: "bg-emerald-500",
    shipped: "bg-blue-500",
    packed: "bg-amber-500",
    canceled: "bg-rose-500"
  };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-slate-400'}`} />
      <span className="text-[10px] font-bold text-slate-700 uppercase">{status}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

function NotFoundState({ navigate }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
      Order Not Found • <button onClick={() => navigate("/daraz-orders")} className="ml-2 text-blue-600 underline">Exit</button>
    </div>
  );
}