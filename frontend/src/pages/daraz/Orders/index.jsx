import { useEffect, useState, useMemo } from "react";
import API from "../../../config/api";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  Search, Package, DollarSign, TrendingUp, 
  Clock, CheckCircle2, XCircle, 
  Truck, Box, CalendarDays, Calendar as CalendarIcon,
  Store, ChevronDown
} from "lucide-react";

// --- CUSTOM TAILWIND COMPONENTS ---

function CustomSelect({ value, onChange, options, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className="relative w-44">
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-900" />}
          <span className="text-xs font-extrabold text-blue-900">{selectedLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-blue-900 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-[115%] left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-1"
            >
              {options.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-blue-600 text-white' // Blue selection from image
                        : 'text-slate-600 hover:bg-slate-100' // Hover effect missing fix
                      }`}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex flex-col gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</h4>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
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

    if (search) {
      const kw = search.toLowerCase();
      data = data.filter(o => 
        String(o.order_id).includes(kw) || 
        String(o.customer_first_name).toLowerCase().includes(kw)
      );
    }

    if (status !== "all") data = data.filter(o => o.statuses?.includes(status));
    if (selectedStore !== "all") data = data.filter(o => o.account_name === selectedStore);

    if (dateRange !== "all") {
      data = data.filter(o => {
        const orderDate = new Date(o.created_at);
        switch (dateRange) {
          case "today": return (now - orderDate) / (1000 * 60 * 60 * 24) < 1;
          case "7d": return (now - orderDate) / (1000 * 60 * 60 * 24) <= 7;
          case "custom": return startDate && endDate ? (orderDate >= startDate && orderDate <= endDate) : true;
          default: return true;
        }
      });
    }
    return data;
  }, [orders, search, status, dateRange, selectedStore, startDate, endDate]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-slate-500 mt-4 tracking-widest">LOADING ORDERS...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="">
      
      {/* Global CSS for DatePicker to match image */}
      <style>{`
        .react-datepicker { border-radius: 12px; border: 1px solid #e2e8f0; font-family: inherit; overflow: hidden; }
        .react-datepicker__header { background: white; border-bottom: none; padding-top: 15px; }
        .react-datepicker__day--selected { background-color: #3b82f6 !important; border-radius: 6px; }
        .react-datepicker__day:hover { border-radius: 6px; }
      `}</style>

      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <header className="mb-8 flex flex-wrap justify-between items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-none">Orders</h1>
              <p className="text-sm text-slate-500 mt-1">Viewing {filteredOrders.length} entries</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                { value: "custom", label: "Custom Range" },
              ]}
            />

            {dateRange === "custom" && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 items-center">
                <DatePicker 
                  selected={startDate} onChange={d => setStartDate(d)}
                  placeholderText="dd/mm/yyyy"
                  className="bg-white border border-slate-900 rounded-full px-4 py-2 text-xs font-bold text-blue-900 outline-none w-32 text-center"
                />
                <DatePicker 
                  selected={endDate} onChange={d => setEndDate(d)}
                  placeholderText="dd/mm/yyyy"
                  className="bg-white border border-slate-900 rounded-full px-4 py-2 text-xs font-bold text-blue-900 outline-none w-32 text-center"
                />
              </motion.div>
            )}
          </div>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Revenue" value={`Rs ${filteredOrders.reduce((s,o)=>s+parseFloat(o.price||0),0).toLocaleString()}`} icon={<DollarSign className="text-blue-600" />} />
          <StatCard title="Total Volume" value={filteredOrders.length} icon={<Box className="text-indigo-600" />} />
          <StatCard title="Avg. Ticket" value="Rs 1,450" icon={<TrendingUp className="text-emerald-600" />} />
          <StatCard title="Active" value="Live" icon={<Clock className="text-amber-600" />} />
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex overflow-x-auto no-scrollbar">
            {["all", "delivered", "shipped", "packed", "canceled"].map((s) => (
              <button
                key={s} onClick={() => setStatus(s)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap
                  ${status === s ? 'bg-blue-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              placeholder="Search Order ID, Customer..." 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-bottom border-slate-100">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Info</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map((o) => (
                  <tr 
                    key={o.order_id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => window.open(`/daraz-orders/${o.order_id}`, "_blank")}
                  >
                    <td className="p-6">
                      <div className="font-black text-slate-900">#{o.order_id}</div>
                      <div className="text-[10px] font-bold text-blue-500 uppercase mt-1">{o.account_name}</div>
                    </td>
                    <td className="p-6">
                      <div className="font-bold text-slate-700">{o.customer_first_name}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <CalendarDays size={12} /> {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                        {o.statuses?.[0] || 'Pending'}
                      </span>
                    </td>
                    <td className="p-6 text-right font-black text-blue-900 text-base">
                      Rs {parseFloat(o.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}