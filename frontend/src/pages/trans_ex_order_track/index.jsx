import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, Package, Truck, CheckCircle2, 
  Box, Phone, Navigation, Warehouse, RotateCcw, Tag, User, CreditCard
} from "lucide-react";
import API from "../../config/api";

const TrackOrder = () => {
  const [waybillId, setWaybillId] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryWaybill = params.get("waybill_id");

  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(",", " -");
  };

  const handleTrack = async () => {
    if (!waybillId) return;
    try {
      setLoading(true);
      const res = await API.post("/transorder/track", { waybill_id: waybillId });
      if (res.data.success) {
        setOrderData(res.data.data);
      } else {
        alert(res.data.message || "Shipment not found");
      }
    } catch (err) {
      console.error(err);
      alert("Error tracking order");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackAuto = async (wb) => {
    if (!wb) return;
    try {
      setLoading(true);
      const res = await API.post("/transorder/track", { waybill_id: wb });
      if (res.data.success) {
        setOrderData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryWaybill) {
      setWaybillId(queryWaybill);
      handleTrackAuto(queryWaybill);
    }
  }, [queryWaybill]);

  const getStatusBranding = (name) => {
    const s = name.toLowerCase();
    if (s.includes("warehouse") || s.includes("collected")) 
      return { color: "text-emerald-500", icon: <Warehouse size={20} />, bg: "bg-emerald-50", border: "border-emerald-100" };
    if (s.includes("dispatch")) 
      return { color: "text-blue-500", icon: <Truck size={20} />, bg: "bg-blue-50", border: "border-blue-100" };
    if (s.includes("destination") || s.includes("received")) 
      return { color: "text-amber-500", icon: <Navigation size={20} />, bg: "bg-amber-50", border: "border-amber-100" };
    if (s.includes("out for delivery")) 
      return { color: "text-indigo-500", icon: <Tag size={20} />, bg: "bg-indigo-50", border: "border-indigo-100" };
    if (s.includes("re-assign") || s.includes("rider")) 
      return { color: "text-purple-500", icon: <RotateCcw size={20} />, bg: "bg-purple-50", border: "border-purple-100" };
    if (s.includes("deliver")) 
      return { color: "text-green-600", icon: <CheckCircle2 size={20} />, bg: "bg-green-50", border: "border-green-100" };
    return { color: "text-slate-400", icon: <Box size={20} />, bg: "bg-slate-50", border: "border-slate-100" };
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] p-4 md:p-10 font-sans text-slate-600">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER AREA */}
        <div className={`mb-10 flex flex-col md:flex-row justify-between items-center border-b border-slate-100 pb-6 gap-4`}>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Track Shipment</h1>
            <p className="text-xs font-semibold text-slate-400 italic">Waybill: #{waybillId || '---'}</p>
          </div>
          
          {/* ✅ CONDITIONALLY HIDE SEARCH BUTTON AREA IF AUTO-GENERATED */}
          {!queryWaybill && (
            <div className="flex w-full max-w-sm gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <input 
                type="text" 
                placeholder="Enter Waybill ID..." 
                value={waybillId}
                onChange={(e) => setWaybillId(e.target.value)}
                className="flex-1 bg-transparent px-4 py-2 font-bold text-slate-900 outline-none text-sm"
              />
              <button 
                onClick={handleTrack}
                disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md text-sm"
              >
                {loading ? "..." : "Track"}
              </button>
            </div>
          )}

          {loading && queryWaybill && (
             <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase animate-pulse">
                <RotateCcw size={14} className="animate-spin" /> Auto Syncing...
             </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {orderData ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Receiver Information</p>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                       <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{orderData.customer_name}</h2>
                      <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-2"><Phone size={12}/> {orderData.customer_phone_no}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-2"><MapPin size={12}/> {orderData.customer_address}, {orderData.customer_city}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/40 rounded-[2rem] p-7 border border-blue-50 flex flex-col justify-center relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Current Status</p>
                    <p className="text-md font-bold text-blue-700">{orderData.current_status}</p>
                    <p className="text-[10px] text-blue-400 mt-2 font-bold tracking-tight">ORDER REF: {orderData.order_no}</p>
                  </div>
                  <Truck size={100} className="absolute -right-6 -bottom-6 text-blue-100/30 -rotate-12" />
                </div>
              </div>

              {/* STAGGERED DUAL-SIDED TIMELINE */}
              <div className="relative py-12 bg-white rounded-[3rem] border border-slate-50 shadow-sm p-6 md:p-16">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-100 -translate-x-1/2 hidden md:block" />

                <div className="space-y-16 md:space-y-0 relative">
                  {orderData.status_history?.map((item, i) => {
                    const brand = getStatusBranding(item.name);
                    const isLeft = i % 2 !== 0;

                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: isLeft ? 40 : -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={`relative flex flex-col md:flex-row items-center w-full ${isLeft ? 'md:flex-row-reverse' : ''} md:mb-20`}
                      >
                        <div className={`w-full md:w-[45%] ${isLeft ? 'md:text-left' : 'md:text-right'} p-2`}>
                          <span className={`text-[10px] font-bold px-4 py-1.5 rounded-full ${brand.bg} ${brand.color} mb-3 inline-block shadow-sm`}>
                            {formatDateTime(item.added_date)}
                          </span>
                          <h3 className="text-base font-bold text-slate-800 mt-1 uppercase tracking-tight">{item.name}</h3>
                          <div className="mt-3 p-5 rounded-3xl bg-slate-50/50 border border-slate-100 shadow-sm transition-all hover:bg-white inline-block w-full">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                              {item.remarks || "Updated by logistics center."}
                            </p>
                          </div>
                        </div>

                        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center">
                          <motion.div 
                            whileHover={{ scale: 1.15 }}
                            className={`z-10 w-14 h-14 rounded-2xl bg-white border-2 ${brand.border} flex items-center justify-center ${brand.color} shadow-lg shadow-slate-100`}
                          >
                            {brand.icon}
                          </motion.div>
                        </div>

                        <div className={`md:hidden my-5 w-12 h-12 rounded-2xl border ${brand.border} flex items-center justify-center ${brand.bg} ${brand.color} shadow-sm`}>
                           {brand.icon}
                        </div>
                        
                        <div className="hidden md:block w-[45%]" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-[50vh] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem]">
              <Package size={50} className="text-slate-100 mb-4 animate-bounce" />
              <p className="text-slate-300 text-xs font-bold uppercase tracking-[0.3em]">
                {loading ? "Searching Shipment..." : "Awaiting Shipment Data..."}
              </p>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default TrackOrder;