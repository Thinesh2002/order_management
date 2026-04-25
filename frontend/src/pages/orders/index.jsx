import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, Pencil, Trash2, Search, Plus, 
  ChevronDown, ExternalLink, RotateCcw, Package, 
  Globe, UserCircle, Loader2 
} from "lucide-react";
import API from "../../config/api";

const UnifiedOrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("7");
  const [statusFilter, setStatusFilter] = useState([]);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const options = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "7" },
    { label: "Last 30 Days", value: "30" },
    { label: "This Month", value: "thisMonth" },
    { label: "Last Month", value: "lastMonth" },
    { label: "Last 90 Days", value: "90" },
  ];

  const statusOptions = ["Pending", "In Progress", "Delivered", "Cancelled", "Returned"];

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [manualRes, wooRes] = await Promise.all([
        API.get("/orders/all"),
        API.get("/woo/orders")
      ]);

      const manual = (manualRes.data.data || []).map(o => ({ 
        ...o, 
        source: 'MANUAL', 
        unifiedId: `M-${o.order_id}`,
        sortDate: new Date(o.created_at) 
      }));
      
      const woo = (wooRes.data.data || []).map(o => ({ 
        ...o, 
        source: 'WOO', 
        unifiedId: `W-${o.id}`,
        sortDate: new Date(o.date_created) 
      }));

      const combined = [...manual, ...woo].sort((a, b) => b.sortDate - a.sortDate);
      setOrders(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "pending": return { label: "Pending", style: "bg-red-600 text-white" };
      case "processing":
      case "in progress": return { label: "In Progress", style: "bg-yellow-500 text-white" };
      case "delivered":
      case "completed": return { label: "Delivered", style: "bg-green-600 text-white" };
      case "cancelled": return { label: "Cancelled", style: "bg-gray-700 text-white" };
      case "returned": return { label: "Returned", style: "bg-orange-600 text-white" };
      default: return { label: status || "Pending", style: "bg-gray-600 text-white" };
    }
  };

  const filteredOrders = orders.filter((o) => {
    const s = search.toLowerCase();
    const customer = o.source === 'MANUAL' ? o.customer_name : `${o.billing?.first_name} ${o.billing?.last_name}`;
    const match = String(o.source === 'MANUAL' ? o.order_id : o.id).includes(s) || 
                  customer?.toLowerCase().includes(s) ||
                  (o.source === 'MANUAL' ? o.phone_1 : o.billing?.phone)?.includes(s) ||
                  (o.source === 'MANUAL' ? o.city : o.billing?.city)?.toLowerCase().includes(s);

    const statusLabel = getStatusConfig(o.source === 'MANUAL' ? o.order_status : o.status).label;
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(statusLabel);

    return match && statusMatch;
  });

  return (
    <div className="min-h-screen pb-10 font-sans text-slate-900 bg-white">
      <div className="max-w-[1600px] mx-auto pt-6">
        <div className="flex items-center justify-between mb-4 px-4 gap-4">
          <div className="relative flex items-center max-w-md w-full">
            <input
              type="text"
              placeholder="Search Unified Feed (ID, Phone, City...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none shadow-sm"
            />
            <Search className="absolute left-3 text-slate-400" size={16} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchOrders} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <RotateCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
            </button>

            <div className="relative">
              <button onClick={() => setIsStatusOpen(!isStatusOpen)} className="flex items-center justify-between min-w-[140px] bg-white border border-slate-200 px-4 py-2 text-sm rounded-xl shadow-sm hover:border-blue-400">
                <span className="truncate text-xs font-semibold">{statusFilter.length === 0 ? "All Status" : `${statusFilter.length} Selected`}</span>
                <ChevronDown className={`w-3 h-3 ml-2 text-slate-400 ${isStatusOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStatusOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1">
                  {statusOptions.map(s => (
                    <label key={s} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={statusFilter.includes(s)} onChange={() => setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
                      {s}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => window.open("/create-manual-orders", "_blank")} className="bg-[#0f172a] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <Plus size={14} strokeWidth={3} /> Create Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-100 mb-2">
          {/* Header centered */}
          <div className="col-span-1 text-center">Src</div>
          <div className="col-span-6">Order Details</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="space-y-4 px-4">
          {loading ? (
             <div className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
               Syncing Orders...
             </div>
          ) : filteredOrders.map((o) => {
            const statusConfig = getStatusConfig(o.source === 'MANUAL' ? o.order_status : o.status);
            const orderId = o.source === 'MANUAL' ? o.order_id : o.id;
            const total = Number(o.source === 'MANUAL' ? o.order_total : o.total);
            const detailPath = o.source === 'MANUAL' ? `/manual-orders/view/${o.order_id}` : `/woo-orders/view/${o.id}`;

            return (
              <div key={o.unifiedId} className="relative bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-blue-100 transition-all group">
                <div className={`absolute top-0 right-0 px-4 py-1 text-[11px] font-[500] uppercase rounded-bl-[7px] shadow-sm ${statusConfig.style}`}>
                  {statusConfig.label}
                </div>

                <div className="grid grid-cols-12 items-start">
                  {/* SOURCE COLUMN - Centered */}
                  <div className="col-span-1 flex flex-col items-center justify-center self-center text-center border-r border-slate-50 pr-4">
                    {o.source === 'WOO' ? <Globe size={20} className="text-purple-500" /> : <UserCircle size={20} className="text-blue-500" />}
                    <span className="text-[9px] font-black mt-1.5 uppercase text-slate-500 tracking-wider">{o.source}</span>
                  </div>

                  <div className="col-span-6 pr-6 pl-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <a href={detailPath} target="_blank" rel="noreferrer" className="text-blue-600 font-[700] text-sm tracking-wide flex items-center gap-1 hover:underline">
                        #{orderId} <ExternalLink size={12} />
                      </a>
                      <div className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded-md">
                        {o.sortDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    
                    <a href={detailPath} target="_blank" rel="noreferrer" className="block text-[13px] text-slate-700 font-[500] mb-4 truncate hover:text-blue-600 transition-colors">
                      {o.source === 'WOO' ? o.line_items?.map(li => li.name).join(", ") : (o.sku_qty || "Manual Order Items")}
                    </a>

                    {/* IMAGES with Zoom and New Tab */}
                    <div className="flex gap-2.5 p-2 border border-slate-50 rounded-xl bg-slate-50/50 w-fit">
                        {o.source === 'WOO' ? (
                          o.line_items?.slice(0, 3).map((item, i) => {
                            const imgUrl = item.image?.src || "/images/no-image.png";
                            return (
                              <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden configuration-transition">
                                <img 
                                  src={imgUrl} 
                                  className="w-full h-full object-cover configuration-transition hover:scale-125 cursor-zoom-in" 
                                  alt="product" 
                                />
                              </a>
                            )
                          })
                        ) : (
                          <div className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 shadow-sm">
                             <Package size={20} />
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="col-span-3 text-[13px] pt-1 border-l border-slate-50 pl-6">
                    <div className="text-slate-900 font-bold mb-1 truncate">
                      {o.source === 'MANUAL' ? o.customer_name : `${o.billing?.first_name} ${o.billing?.last_name}`}
                    </div>
                    <div className="text-slate-500 text-[11px] leading-relaxed mt-1">
                      {o.source === 'MANUAL' ? o.city : o.billing?.city}<br />
                      <span className="font-medium text-slate-800 tracking-tight">
                        {o.source === 'MANUAL' ? o.phone_1 : o.billing?.phone}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1 pt-1 text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total</div>
                    <div className="font-mono font-black text-sm text-slate-900">
                      Rs {total.toLocaleString()}
                    </div>
                  </div>

                  <div className="col-span-1 pt-8 flex justify-end gap-4 text-slate-300 group-hover:text-slate-500">
                    <button onClick={() => window.open(o.source === 'MANUAL' ? `/manual-orders/edit/${o.order_id}` : `/woo-orders/edit/${o.id}`, "_blank")}>
                      < Pencil size={16} className="cursor-pointer hover:text-yellow-600" />
                    </button>
                    <Trash2 size={16} className="cursor-pointer hover:text-red-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UnifiedOrderDashboard;