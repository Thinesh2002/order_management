import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import API, { SKU_IMAGE_API_BASE_URL } from "../../../../config/api";
import { ArrowLeft, CreditCard, Mail, Phone, Truck, User, Package, X, CheckCircle, Globe, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import InvoiceTemplate from "../invoice_template/index";

const Manual_detail_order_view = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef();

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status Update States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [waybillId, setWaybillId] = useState("");
  const [shippingCostActual, setShippingCostActual] = useState(""); 
  const [deliveryType, setDeliveryType] = useState("Courier"); 
  const [updating, setUpdating] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const orderRes = await API.get("/orders/all");
      const foundOrder = orderRes.data.data.find((o) => o.order_id === id);
      setOrder(foundOrder || null);
      
      setNewStatus(foundOrder?.order_status || "");
      setShippingCostActual(foundOrder?.shipping_cost_actual || "");
      
      if (foundOrder?.waybill_id === "BrightHUB") {
        setDeliveryType("BrightHUB");
        setWaybillId("");
      } else {
        setDeliveryType("Courier");
        setWaybillId(foundOrder?.waybill_id || "");
      }

      const res = await API.get(`/orders/items/${id}`);
      setItems(res.data.data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      alert("Please select status");
      return;
    }

    if (deliveryType === "Courier" && !waybillId.trim()) {
      alert("Waybill ID is required for Courier delivery!");
      return;
    }

    try {
      setUpdating(true);
      const finalWaybill = deliveryType === "BrightHUB" ? "BrightHUB" : waybillId;

      await API.put(`/orders/update/${id}`, {
        order: {
          ...order,
          order_status: newStatus,
          waybill_id: finalWaybill,
          shipping_cost_actual: Number(shippingCostActual) || 0,
        },
        items,
      });

      alert("Status updated successfully!");
      setShowStatusModal(false);
      fetchData();
    } catch (err) {
      console.error("Update Error:", err);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered": return "bg-green-100 text-green-700 border-green-200";
      case "pending": return "bg-orange-100 text-orange-700 border-orange-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
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
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Order #{id}</h1>
            <span className={`px-4 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${getStatusStyle(order.order_status)}`}>
              {order.order_status || "Processing"}
            </span>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handlePrint} className="flex-1 md:flex-none px-5 py-2.5 border border-gray-300 rounded-xl bg-white text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
            Download Invoice
          </button>
          <button onClick={() => setShowStatusModal(true)} className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md">
            Update Status
          </button>
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
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/40 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 group-hover:scale-105 transition-transform">
                            <img src={item.preview_image ? `${SKU_IMAGE_API_BASE_URL}/images/productimage/${item.sku}/${item.preview_image}` : "https://via.placeholder.com/150"} alt={item.product_name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800 line-clamp-1">{item.product_name}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1 uppercase tracking-tight">SKU: {item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-lg text-gray-700">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-medium">Rs {Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-5 text-right font-bold text-sm text-blue-700">Rs {Number(item.item_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100">
              <div className="ml-auto max-w-[320px] space-y-4">
                <div className="flex justify-between items-center text-sm text-gray-600 font-bold">
                  <span>Subtotal</span>
                  <span className="text-gray-900">Rs {Number(order.order_total - (order.shipping_cost_fixed || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 font-bold">
                  {/* CHANGED: Label updated to Buyer Paid Shipping Fee */}
                  <span>Buyer Paid Shipping Fee</span>
                  <span className="text-gray-900">Rs {Number(order.shipping_cost_fixed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-base font-extrabold text-gray-900 uppercase">Grand Total</span>
                  <span className="text-xl font-black text-blue-700 font-mono">Rs {Number(order.order_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ADDED: Order Notes Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4 text-gray-800">Order Notes</h2>
            <textarea
              placeholder="No notes provided..."
              value={order.note || ""}
              readOnly
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none transition-all min-h-[100px] resize-none text-slate-700 font-medium"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 text-emerald-600 font-extrabold text-sm mb-6 uppercase tracking-wider">
              <div className="bg-emerald-100 p-2 rounded-lg"><CreditCard size={18} /></div>
              {order.payment_method || "Paid Online"}
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black mb-3 tracking-[0.2em]">Shipping Method</p>
                <div className="flex items-center gap-3 text-sm font-bold bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <Truck size={18} className="text-blue-500" /> Standard Delivery
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black mb-3 tracking-[0.2em]">Waybill ID</p>
                <div 
                  onClick={() => order.waybill_id && order.waybill_id !== "BrightHUB" && navigate(`/trans-ex/track-orders?waybill_id=${order.waybill_id}`)}
                  className={`text-sm font-bold p-4 rounded-xl border italic transition-all ${order.waybill_id && order.waybill_id !== "BrightHUB" ? 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 cursor-pointer' : 'bg-slate-50 border-slate-100 text-slate-800 cursor-default'}`}
                >
                  {order.waybill_id || "Not assigned"}
                </div>
                {/* ADDED: Actual Shipping Fee Display under Waybill ID */}
                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Actual Shipping Fee:</p>
                <p className="text-sm font-black text-red-600">Rs {Number(order.shipping_cost_actual || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-[10px] text-gray-400 uppercase font-black mb-4 tracking-[0.2em]">Delivery Address</p>
            <div className="text-sm space-y-1">
              <p className="font-extrabold text-gray-900 text-base mb-2">{order.customer_name || "Guest Customer"}</p>
              <p className="text-gray-600 font-medium leading-relaxed">
                {order.address_line1 || "No address provided"}<br />
                {order.address_line2 && <>{order.address_line2}<br /></>}
                <span className="font-bold text-slate-800">{order.city || "N/A"}</span>
              </p>
            </div>
          </div>

          {/* ADDED: Customer Profile Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-[10px] text-gray-400 uppercase font-black mb-5 tracking-[0.2em]">Customer Profile</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><User size={20} /></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Name</p>
                  <p className="text-sm font-bold text-slate-800">{order.customer_name || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Mail size={18} /></div>
                <div className="overflow-hidden">
                  <p className="text-xs text-gray-400 font-bold uppercase">Email</p>
                  <p className="text-sm font-bold truncate text-blue-600">{order.customer_email || "no-email"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Phone size={18} /></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Phone</p>
                  <p className="text-sm font-bold text-slate-800">{order.phone_1 || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS UPDATE MODAL */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-white text-slate-900">
                <h3 className="font-black text-xl">Update Order</h3>
                <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6 text-slate-900">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Channel</label>
                  <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
                    <button onClick={() => setDeliveryType("Courier")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${deliveryType === "Courier" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}><Truck size={16} /> Courier</button>
                    <button onClick={() => setDeliveryType("BrightHUB")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${deliveryType === "BrightHUB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}><Globe size={16} /> BrightHUB</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">New Status</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm">
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <AnimatePresence>
                  {deliveryType === "Courier" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Waybill ID</label>
                      <div className="relative mb-4"><input type="text" value={waybillId} onChange={(e) => setWaybillId(e.target.value)} placeholder="Tracking ID" className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm" /><Truck size={18} className="absolute left-4 top-4 text-gray-400" /></div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* MODIFIED: Actual Shipping Cost visible for BOTH channels */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Actual Shipping Fee</label>
                  <div className="relative"><input type="number" value={shippingCostActual} onChange={(e) => setShippingCostActual(e.target.value)} placeholder="0.00" className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm font-mono" /><DollarSign size={18} className="absolute left-4 top-4 text-gray-400" /></div>
                </div>

                <button onClick={handleUpdateStatus} disabled={updating} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg flex justify-center items-center gap-2 mt-4">
                  {updating ? "Processing..." : <><CheckCircle size={18} /> Confirm Update</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ display: "none" }}>
        <InvoiceTemplate ref={componentRef} order={order} items={items} />
      </div>
    </div>
  );
};

export default Manual_detail_order_view;