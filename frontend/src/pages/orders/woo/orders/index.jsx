import React, { useEffect, useState } from "react";
import API from "../../../../config/api";
import { 
  Search, Plus, ChevronDown, ExternalLink, Truck, 
  CircleDollarSign, Package, User, MapPin, Phone,
  CreditCard, Loader2, MessageSquare, Pencil, Trash2, XCircle, ShoppingBag
} from "lucide-react";

const WooOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const statusOptions = ["Processing", "Completed", "Pending", "Cancelled", "On Hold"];

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get("/woo/orders");
      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "completed": return { label: "Completed", style: "bg-green-600 text-white" };
      case "processing": return { label: "Processing", style: "bg-blue-500 text-white" };
      case "pending": return { label: "Pending", style: "bg-yellow-500 text-white" };
      case "cancelled": return { label: "Cancelled", style: "bg-gray-700 text-white" };
      case "on-hold": return { label: "On Hold", style: "bg-orange-500 text-white" };
      default: return { label: status, style: "bg-slate-500 text-white" };
    }
  };

  const filteredOrders = orders.filter((o) => {
    const s = search.toLowerCase();
    const match = 
      String(o.id).includes(s) || 
      o.billing?.first_name?.toLowerCase().includes(s) ||
      o.billing?.phone?.includes(s) ||
      o.billing?.city?.toLowerCase().includes(s);
    
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(o.status.charAt(0).toUpperCase() + o.status.slice(1));
    return match && statusMatch;
  });

  const toggleStatus = (status) => {
    setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  // Stats Calculations
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const avgOrderValue = totalRevenue / (filteredOrders.length || 1);

  return (
    <div className="min-h-screen pb-10 bg-[#f8fafc] font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto pt-6">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4 mb-8">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Woo Orders</div>
            <div className="font-black text-2xl mt-1">{filteredOrders.length}</div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Sales</div>
            <div className="font-black text-2xl mt-1 text-blue-600 flex items-baseline gap-1">
              <span className="text-xs font-bold font-mono">Rs</span> {totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Avg Value</div>
            <div className="font-black text-2xl mt-1 text-slate-700">
              <span className="text-xs font-bold font-mono">Rs</span> {avgOrderValue.toFixed(0)}
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="text-green-500 text-[10px] font-bold uppercase tracking-widest">Completed</div>
            <div className="font-black text-2xl mt-1">
              {filteredOrders.filter(o => o.status === 'completed').length}
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Active Processing</div>
            <div className="font-black text-2xl mt-1">
              {filteredOrders.filter(o => o.status === 'processing').length}
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex items-center justify-between mb-6 px-4 gap-4">
          <div className="relative flex items-center max-w-md w-full">
            <input
              type="text"
              placeholder="Search Woo Orders (ID, Name, Phone...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none shadow-sm transition-all"
            />
            <Search className="absolute left-3 text-slate-400" size={18} />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="flex items-center justify-between min-w-[160px] bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold rounded-xl shadow-sm hover:border-blue-400 transition-all uppercase tracking-tighter"
              >
                <span>{statusFilter.length === 0 ? "Filter Status" : `${statusFilter.length} Selected`}</span>
                <ChevronDown size={14} className={`ml-2 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStatusOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1">
                  {statusOptions.map((s) => (
                    <label key={s} className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded text-blue-600" checked={statusFilter.includes(s)} onChange={() => toggleStatus(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <button onClick={fetchOrders} className="bg-[#0f172a] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-slate-200">
               Refresh Store
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div className="grid grid-cols-12 px-8 py-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 mb-2">
          <div className="col-span-7">Order & Product Info</div>
          <div className="col-span-3">Billing Details</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* ORDERS LIST */}
        <div className="space-y-4 px-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <Loader2 className="animate-spin mb-2" size={32} />
               <span className="text-[10px] font-black uppercase tracking-widest">Loading...</span>
             </div>
          ) : filteredOrders.map((o) => {
            const statusCfg = getStatusConfig(o.status);
            return (
              <div key={o.id} className="relative bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                <div className={`absolute top-0 right-0 px-5 py-1 text-[10px] font-black uppercase rounded-bl-xl shadow-sm ${statusCfg.style}`}>
                  {statusCfg.label}
                </div>

                <div className="grid grid-cols-12 items-start">
                  {/* LEFT: ORDER & ITEMS */}
                  <div className="col-span-7 pr-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-blue-600 font-black text-base tracking-tight">#{o.id}</span>
                      <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                        <CreditCard size={12} /> {o.payment_method_title || "Direct"}
                      </div>
                      <div className="text-slate-400 text-[10px] font-bold">
                        {new Date(o.date_created).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {o.line_items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-xl border border-slate-50">
                          {item.image?.src ? (
                            <img src={item.image.src} className="w-12 h-12 object-cover rounded-lg border border-white shadow-sm" alt="sku" />
                          ) : (
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-300 border border-slate-100"><Package size={20}/></div>
                          )}
                          <div>
                            <div className="text-[13px] font-black text-slate-800 uppercase leading-tight truncate max-w-md">{item.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">QTY {item.quantity}</span>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SKU: {item.sku || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MIDDLE: CUSTOMER */}
                  <div className="col-span-3 text-[13px] pt-1 border-l border-slate-50 pl-8">
                    <div className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-tight mb-2">
                       <User size={14} className="text-blue-500" />
                       {o.billing?.first_name} {o.billing?.last_name}
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-slate-500 text-[11px] flex items-start gap-2">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        <span>{o.billing?.address_1}, {o.billing?.city}</span>
                      </div>
                      <div className="text-blue-600 text-[11px] font-bold flex items-center gap-2">
                        <Phone size={12} /> {o.billing?.phone}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: TOTAL */}
                  <div className="col-span-1 pt-1 text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.1em] mb-1">Total Pay</div>
                    <div className="font-mono font-black text-base text-slate-900">
                      Rs {Number(o.total).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Items: {o.line_items?.length}</div>
                  </div>

                  {/* ACTIONS */}
                  <div className="col-span-1 pt-8 flex justify-end gap-4 text-slate-300 group-hover:text-slate-400 transition-colors">
                    <MessageSquare size={18} className="cursor-pointer hover:text-blue-500" />
                    <Pencil size={18} className="cursor-pointer hover:text-yellow-600" />
                    <Trash2 size={18} className="cursor-pointer hover:text-red-500" />
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

export default WooOrders;