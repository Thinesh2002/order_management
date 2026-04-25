import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../../../config/api";
import { 
  ArrowLeft, CreditCard, Mail, Phone, Truck, User, 
  Package, Globe, DollarSign, Calendar 
} from "lucide-react";

const WooOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/woo/orders`);
      const found = res.data.data.find((o) => o.id == id);
      setOrder(found);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "completed": return "bg-green-100 text-green-700 border-green-200";
      case "pending": return "bg-orange-100 text-orange-700 border-orange-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      case "processing": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen font-medium">Loading...</div>;
  if (!order) return <div className="flex justify-center items-center h-screen text-red-500 font-semibold">Order Not Found</div>;

  return (
    <div className="p-4 md:p-8 bg-[#f8f9fa] min-h-screen text-slate-900 font-sans relative">
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-2 transition-all font-medium">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Woo Order #{id}</h1>
            <span className={`px-4 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${getStatusStyle(order.status)}`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2 font-bold text-lg">
              <Package size={20} className="text-blue-600" />
              Order Items
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50/80 text-gray-500 text-[11px] uppercase font-bold tracking-[0.1em]">
                  <tr>
                    <th className="px-6 py-4 text-left">Product Details</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.line_items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/40 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 group-hover:scale-105 transition-transform">
                            <img src={item.image?.src || "https://via.placeholder.com/150"} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1 uppercase tracking-tight">SKU: {item.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-lg text-gray-700">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-sm text-blue-700">Rs {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100">
              <div className="ml-auto max-w-[320px] space-y-4">
                <div className="flex justify-between items-center text-sm text-gray-600 font-bold">
                  <span>Subtotal</span>
                  <span className="text-gray-900">Rs {Number(order.total - order.shipping_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 font-bold">
                  <span>Shipping Fee</span>
                  <span className="text-gray-900">Rs {Number(order.shipping_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-base font-extrabold text-gray-900 uppercase">Grand Total</span>
                  <span className="text-xl font-black text-blue-700 font-mono">Rs {Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4 text-gray-800">Customer Note</h2>
            <textarea
              value={order.customer_note || "No notes provided by customer..."}
              readOnly
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none transition-all min-h-[100px] resize-none text-slate-700 font-medium"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 text-emerald-600 font-extrabold text-sm mb-6 uppercase tracking-wider">
              <div className="bg-emerald-100 p-2 rounded-lg"><CreditCard size={18} /></div>
              {order.payment_method_title || "Online Payment"}
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black mb-3 tracking-[0.2em]">Order Date</p>
                <div className="flex items-center gap-3 text-sm font-bold bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <Calendar size={18} className="text-blue-500" /> 
                  {new Date(order.date_created).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black mb-3 tracking-[0.2em]">Store Source</p>
                <div className="flex items-center gap-3 text-sm font-bold bg-purple-50 p-4 rounded-xl border border-purple-100 text-purple-700">
                  <Globe size={18} /> WooCommerce Store
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-[10px] text-gray-400 uppercase font-black mb-4 tracking-[0.2em]">Shipping Address</p>
            <div className="text-sm space-y-1">
              <p className="font-extrabold text-gray-900 text-base mb-2">
                {order.shipping.first_name} {order.shipping.last_name}
              </p>
              <p className="text-gray-600 font-medium leading-relaxed">
                {order.shipping.address_1}<br />
                {order.shipping.address_2 && <>{order.shipping.address_2}<br /></>}
                <span className="font-bold text-slate-800">{order.shipping.city}, {order.shipping.state}</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-[10px] text-gray-400 uppercase font-black mb-5 tracking-[0.2em]">Customer Profile</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><User size={20} /></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Name</p>
                  <p className="text-sm font-bold text-slate-800">{order.billing.first_name} {order.billing.last_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Mail size={18} /></div>
                <div className="overflow-hidden">
                  <p className="text-xs text-gray-400 font-bold uppercase">Email</p>
                  <p className="text-sm font-bold truncate text-blue-600">{order.billing.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Phone size={18} /></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Phone</p>
                  <p className="text-sm font-bold text-slate-800">{order.billing.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WooOrderDetail;