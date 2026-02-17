import { useEffect, useState, useMemo } from "react";
import API from "../../../config/api";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  Search, Package, DollarSign, TrendingUp, 
  Clock, CheckCircle2, XCircle, 
  Truck, Box, CalendarDays, Calendar as CalendarIcon,
  Store, ChevronDown, Check, Layers
} from "lucide-react";

// --- MULTI-SELECT STATUS DROPDOWN COMPONENT ---
function StatusMultiSelect({ selectedStatuses, setSelectedStatuses }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const statusOptions = [
    { id: "delivered", label: "Delivered", icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
    { id: "shipped", label: "Shipped", icon: <Truck size={14} className="text-blue-600" /> },
    { id: "packed", label: "Packed", icon: <Package size={14} className="text-amber-600" /> },
    { id: "canceled", label: "Canceled", icon: <XCircle size={14} className="text-rose-600" /> },
    { id: "pending", label: "Pending", icon: <Clock size={14} className="text-slate-500" /> },
    { id: "ready_to_ship", label: "Ready to Ship", icon: <Box size={14} className="text-indigo-600" /> },
  ];

  const toggleStatus = (id) => {
    setSelectedStatuses(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative w-[220px]">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer group hover:border-blue-400 transition-all shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Box size={16} className="text-blue-900" />
          <span className="text-xs font-extrabold text-blue-900 uppercase tracking-tight">
            {selectedStatuses.length === 0 ? "All Statuses" : `${selectedStatuses.length} Selected`}
          </span>
        </div>
        <ChevronDown size={14} className={`text-blue-900 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="absolute top-[110%] left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 max-h-[300px] overflow-y-auto"
            >
              <div 
                onClick={() => setSelectedStatuses([])}
                className="p-2 text-[10px] font-black text-blue-500 text-right cursor-pointer hover:text-blue-700 uppercase"
              >
                Clear All
              </div>
              <div className="space-y-1">
                {statusOptions.map((opt) => {
                  const isChecked = selectedStatuses.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleStatus(opt.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isChecked ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {opt.icon}
                        <span className={`text-xs ${isChecked ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-600'}`}>
                          {opt.label}
                        </span>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-blue-900 border-blue-900' : 'border-slate-300'}`}>
                        {isChecked && <Check size={10} className="text-white" strokeWidth={4} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- CUSTOM SELECT COMPONENT ---
function CustomSelect({ value, onChange, options, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className="relative w-[200px]">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all shadow-sm"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-900" />}
          <span className="text-xs font-extrabold text-blue-900 uppercase tracking-tight">{selectedLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-blue-900 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="absolute top-[110%] left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-1"
            >
              <div className="max-h-[250px] overflow-y-auto">
                {options.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`px-3 py-2 text-xs rounded-lg cursor-pointer mb-0.5 last:mb-0 transition-colors ${value === opt.value ? 'bg-blue-900 text-white font-extrabold' : 'text-slate-600 font-semibold hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const getStyle = (s) => {
    switch(s?.toLowerCase()) {
      case 'delivered': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case 'shipped': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'canceled': return "bg-rose-50 text-rose-600 border-rose-100";
      case 'packed': return "bg-amber-50 text-amber-600 border-amber-100";
      case 'shipped_back_success': return "bg-slate-100 text-slate-600 border-slate-200";
      case 'ready_to_ship': return "bg-indigo-50 text-indigo-600 border-indigo-100";
      default: return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border whitespace-nowrap ${getStyle(status)}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// --- MAIN PAGE ---
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([]); 
  const [dateRange, setDateRange] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await API.get("/daraz/all");
      setOrders(res.data.orders || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const availableStores = useMemo(() => {
    const names = orders.map(o => o.account_name).filter(Boolean);
    return ["all", ...new Set(names)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let data = [...orders];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (search) {
      const kw = search.toLowerCase();
      data = data.filter(o => 
        String(o.order_id).includes(kw) || 
        String(o.customer_first_name || '').toLowerCase().includes(kw) ||
        o.products?.some(p => p.product_name?.toLowerCase().includes(kw))
      );
    }

    if (selectedStatuses.length > 0) {
      data = data.filter(o => o.statuses?.some(s => selectedStatuses.includes(s.toLowerCase())));
    }

    if (selectedStore !== "all") data = data.filter(o => o.account_name === selectedStore);

    if (dateRange !== "all") {
      data = data.filter(o => {
        // BACKEND FIELD NAME FIX: created_at_daraz
        const orderDateStr = o.created_at_daraz || o.created_at;
        if (!orderDateStr) return true;
        
        const orderDate = new Date(orderDateStr);
        const diffMs = now - orderDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        switch (dateRange) {
          case "today": return orderDate >= todayStart;
          case "7d": return diffDays <= 7;
          case "30d": return diffDays <= 30;
          case "90d": return diffDays <= 90;
          case "365d": return diffDays <= 365;
          case "thisMonth": return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          case "lastMonth": {
            const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return orderDate.getMonth() === lastM.getMonth() && orderDate.getFullYear() === lastM.getFullYear();
          }
          case "custom":
            if (startDate && endDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                return orderDate >= s && orderDate <= e;
            }
            return true;
          default: return true;
        }
      });
    }
    return data;
  }, [orders, search, selectedStatuses, dateRange, selectedStore, startDate, endDate]);

  const totalSales = filteredOrders.reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center ">
      <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-slate-400 mt-4 tracking-widest uppercase text-xs">Loading Orders...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className=" min-h-screen font-sans">
      
      {/* DatePicker Overrides */}
      <style>{`
        .react-datepicker { border-radius: 16px; border: 1px solid #e2e8f0; font-family: inherit; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .react-datepicker__header { background: white; border-bottom: none; }
        .react-datepicker__day--selected { background-color: #1e3a8a !important; border-radius: 8px; }
        .date-input-custom {
          background: white; border: 1px solid #e2e8f0; border-radius: 30px;
          padding: 8px 16px; font-size: 13px; font-weight: 700; color: #1e3a8a;
          outline: none; width: 140px; text-align: center; cursor: pointer;
        }
      `}</style>

      <div className="max-w-[1600px] mx-auto p-4 sm:p-8">
        
        {/* HEADER */}
        <header className="mb-8 flex flex-wrap justify-between items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 p-3 rounded-2xl shadow-lg">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-none">Orders Master List</h1>
              <p className="text-slate-400 text-sm font-bold mt-1">Viewing {filteredOrders.length} entries</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusMultiSelect selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses} />
            <CustomSelect 
              icon={Store} value={selectedStore} onChange={setSelectedStore}
              options={availableStores.map(s => ({ value: s, label: s === 'all' ? 'All Stores' : s }))}
            />
            <CustomSelect 
              icon={CalendarIcon} value={dateRange} onChange={setDateRange}
              options={[
                { value: "all", label: "Lifetime History" },
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 Days" },
                { value: "30d", label: "Last 30 Days" },
                { value: "90d", label: "Last 90 Days" },
                { value: "365d", label: "Last 365 Days" },
                { value: "thisMonth", label: "This Month" },
                { value: "lastMonth", label: "Last Month" },
                { value: "custom", label: "Custom Range" },
              ]}
            />

            {dateRange === "custom" && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                <DatePicker selected={startDate} onChange={d => setStartDate(d)} placeholderText="Start Date" className="date-input-custom" />
                <span className="text-[10px] font-black text-slate-400 uppercase">to</span>
                <DatePicker selected={endDate} onChange={d => setEndDate(d)} placeholderText="End Date" className="date-input-custom" minDate={startDate} />
              </motion.div>
            )}
          </div>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Revenue" value={`Rs ${totalSales.toLocaleString()}`} icon={<DollarSign className="text-blue-600" />} />
          <StatCard title="Total Volume" value={filteredOrders.length} icon={<Box className="text-indigo-600" />} />
          <StatCard title="Avg. Ticket" value={`Rs ${(totalSales / (filteredOrders.length || 1)).toFixed(0)}`} icon={<TrendingUp className="text-emerald-600" />} />
          <StatCard title="Live Feed" value="Online" icon={<Clock className="text-amber-600" />} />
        </div>

        {/* SEARCH BAR */}
        <div className="mb-6 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            className="w-full pl-14 pr-6 py-4.5 rounded-[22px] border border-slate-200 bg-white shadow-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-700"
            placeholder="Search Order ID, Customer name or Product title..." 
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Info</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Items</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer & Location</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map((o) => (
                  <tr 
                    key={o.order_id} 
                    onClick={() => window.open(`/daraz-orders/${o.order_id}`, "_blank")}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Order Info */}
                    <td className="p-6 align-top">
                      <div className="font-black text-slate-900 text-[15px]">#{o.order_id}</div>
                      <div className="text-[10px] font-black text-blue-500 mt-1 uppercase tracking-tight flex items-center gap-1">
                        <Store size={10} /> {o.account_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold mt-2 uppercase">
                        {o.payment_method || 'N/A'}
                      </div>
                    </td>

                    {/* Product Details */}
                    <td className="p-6 align-top">
                      <div className="space-y-3 max-w-[350px]">
                        {o.products && o.products.length > 0 ? (
                          o.products.map((prod, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-slate-200">
                                <img 
                                  src={prod.image} 
                                  alt="product" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.src = "https://via.placeholder.com/100"; }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 line-clamp-1 leading-tight">
                                  {prod.product_name || prod.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">SKU: {prod.sku?.split('-')[0]}</span>
                                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 rounded">Rs {prod.price}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-300 text-[10px] font-black uppercase italic">No Product Data</div>
                        )}
                        {o.items_count > (o.products?.length || 0) && (
                           <div className="text-[10px] font-black text-slate-400 pl-2">
                             + {o.items_count - o.products.length} more items...
                           </div>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="p-6 align-top">
                      <div className="font-bold text-slate-700">{o.address_shipping?.first_name || o.customer_first_name || 'Guest'}</div>
                      <div className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-slate-300" /> {new Date(o.created_at_daraz || o.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase mt-2 flex items-center gap-1">
                        <Layers size={10} /> {o.address_shipping?.city || 'N/A'}, {o.address_shipping?.address3 || ''}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-6 text-center align-top">
                      <div className="flex flex-col items-center gap-2">
                        <StatusBadge status={o.statuses?.[0]} />
                        {o.warehouse_code && (
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">
                            {o.warehouse_code}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-6 text-right align-top">
                      <div className="font-black text-blue-900 text-base italic tracking-tighter">
                        Rs {parseFloat(o.price || 0).toLocaleString()}
                      </div>
                      {parseFloat(o.voucher || 0) > 0 && (
                        <div className="text-[10px] font-black text-rose-500 mt-1 uppercase">
                          Disc: -{o.voucher}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-slate-400 mt-1">
                         Fee: Rs {o.shipping_fee || 0}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="py-24 text-center">
              <Box size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No orders found</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}