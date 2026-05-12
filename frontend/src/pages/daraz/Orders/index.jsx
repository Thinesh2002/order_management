import { useEffect, useState, useMemo } from "react";
import API from "../../../config/api";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import { Chart } from "react-google-charts"; 
import "react-datepicker/dist/react-datepicker.css";
import { 
  Search, Package, DollarSign, TrendingUp, 
  Clock, CheckCircle2, XCircle, 
  Truck, Box, CalendarDays, Calendar as CalendarIcon,
  Store, ChevronDown, Check, Layers, Download, ChevronLeft, ChevronRight, BarChart3, CreditCard, RotateCcw, RefreshCcw
} from "lucide-react";

// --- MULTI-SELECT STATUS DROPDOWN COMPONENT ---
function StatusMultiSelect({ selectedStatuses, setSelectedStatuses }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const statusOptions = [
    { id: "delivered", label: "Delivered", icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
    { id: "shipped", label: "Shipped", icon: <Truck size={14} className="text-blue-600" /> },
    { id: "packed", label: "Packed", icon: <Package size={14} className="text-amber-600" /> },
    { id: "returned", label: "Returned", icon: <RefreshCcw size={14} className="text-purple-600" /> },
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
    <div className="relative z-20 w-[220px]">
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
function CustomSelect({ value, onChange, options, icon: Icon, width = "w-[200px]" }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className={`relative z-20 ${width}`}>
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

function StatCard({ title, value, icon, subText, colorClass }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass || 'bg-slate-50'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
        {subText && <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 italic">{subText}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const getStyle = (s) => {
    switch(s?.toLowerCase()) {
      case 'delivered': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case 'shipped': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'returned': return "bg-purple-50 text-purple-600 border-purple-100";
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
  const [dateRange, setDateRange] = useState("thisMonth");
  const [selectedStore, setSelectedStore] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let y = [];
    for (let i = 2020; i <= currentYear; i++) {
      y.push({ value: i.toString(), label: i.toString() });
    }
    return y.reverse();
  }, []);

  const months = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" }, { value: "1", label: "February" }, { value: "2", label: "March" },
    { value: "3", label: "April" }, { value: "4", label: "May" }, { value: "5", label: "June" },
    { value: "6", label: "July" }, { value: "7", label: "August" }, { value: "8", label: "September" },
    { value: "9", label: "October" }, { value: "10", label: "November" }, { value: "11", label: "December" },
  ];

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

    data = data.filter(o => {
      const orderDateStr = o.created_at_daraz || o.created_at;
      if (!orderDateStr) return true;
      const orderDate = new Date(orderDateStr);

      if (dateRange === "custom" && startDate && endDate) {
        return orderDate >= new Date(startDate).setHours(0,0,0,0) && orderDate <= new Date(endDate).setHours(23,59,59,999);
      }

      if (dateRange === "yearMonth") {
        const yearMatch = orderDate.getFullYear().toString() === selectedYear;
        const monthMatch = selectedMonth === "all" || orderDate.getMonth().toString() === selectedMonth;
        return yearMatch && monthMatch;
      }

      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
      switch (dateRange) {
        case "today": return orderDate >= todayStart;
        case "7d": return diffDays <= 7;
        case "30d": return diffDays <= 30;
        case "thisMonth": return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        case "lastMonth": {
          const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return orderDate.getMonth() === lastM.getMonth() && orderDate.getFullYear() === lastM.getFullYear();
        }
        case "all": return true;
        default: return true;
      }
    });

    return data;
  }, [orders, search, selectedStatuses, dateRange, selectedStore, startDate, endDate, selectedYear, selectedMonth]);

  // --- STATS LOGIC (NET = RETURNS - EXPENSES if returned) ---
  const dynamicStats = useMemo(() => {
    let totalSales = 0;
    let totalReturnsValue = 0;
    let totalExpenses = 0;
    let netProfit = 0;

    filteredOrders.forEach(o => {
      const price = parseFloat(o.price || 0);
      const ship = parseFloat(o.shipping_fee || 0);
      const comm = price * 0.12;
      const exp = ship + comm;

      totalSales += price;
      totalExpenses += exp;

      if (o.statuses?.some(s => s.toLowerCase() === 'returned')) {
        totalReturnsValue += price;
        // Logic: Return - Expense (2899 - 597.88) show as negative impact
        netProfit += (price - exp) * -1; 
      } else {
        netProfit += (price - exp);
      }
    });

    const getCount = (status) => filteredOrders.filter(o => o.statuses?.some(s => s.toLowerCase() === status)).length;

    return {
      activeRevenue: totalSales,
      returnedRevenue: totalReturnsValue,
      activeNet: netProfit,
      activeExpenses: totalExpenses,
      activeCount: filteredOrders.length,
      canceledCount: getCount('canceled'),
      pendingCount: getCount('pending'),
      readyToShipCount: getCount('ready_to_ship'),
      packedCount: getCount('packed'),
      returnedCount: getCount('returned')
    };
  }, [filteredOrders]);

  const monthlySummary = useMemo(() => {
    const report = {};
    orders.forEach(o => {
      const d = new Date(o.created_at_daraz || o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!report[key]) report[key] = { year: d.getFullYear(), month: d.toLocaleString('default', { month: 'short' }), sales: 0, exp: 0, returns: 0, net: 0 };
      
      const price = parseFloat(o.price || 0);
      const exp = (parseFloat(o.shipping_fee || 0) + (price * 0.12));
      
      report[key].sales += price;
      report[key].exp += exp;

      if (o.statuses?.some(s => s.toLowerCase() === 'returned')) {
        report[key].returns += price;
        // Fixed Logic: total return - total expense (e.g. 2899 - 597.88 = 2301.12 loss)
        report[key].net += (price - exp) * -1;
      } else {
        report[key].net += (price - exp);
      }
    });
    return Object.values(report).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [orders]);

  // --- AREA CHART DATA ---
  const areaChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const monthsArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const data = [["Month", "Current Year Net", "Last Year Net"]];

    monthsArr.forEach((m, i) => {
      const getNet = (year) => {
        const yearOrders = orders.filter(o => {
          const d = new Date(o.created_at_daraz || o.created_at);
          return d.getFullYear() === year && d.getMonth() === i;
        });
        
        return yearOrders.reduce((acc, o) => {
          const p = parseFloat(o.price || 0);
          const e = (parseFloat(o.shipping_fee || 0) + (p * 0.12));
          if (o.statuses?.some(s => s.toLowerCase() === 'returned')) {
            return acc + ((p - e) * -1);
          }
          return acc + (p - e);
        }, 0);
      };
      data.push([m, getNet(currentYear), getNet(lastYear)]);
    });

    return data;
  }, [orders]);

  const pieChartData = useMemo(() => {
    const data = [["Status", "Count"]];
    const statusMap = {};
    filteredOrders.forEach(o => {
      const s = o.statuses?.[0] || "Unknown";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    Object.entries(statusMap).forEach(([status, count]) => data.push([status, count]));
    return data.length > 1 ? data : [["Status", "Count"], ["Empty", 1]];
  }, [filteredOrders]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(firstPageIndex, firstPageIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const exportToCSV = () => {
    const headers = ["Order ID,Date,Customer,Status,Account,Price,Shipping Fee,Net Profit"];
    const csvData = filteredOrders.map(o => {
      const p = parseFloat(o.price || 0);
      const e = (parseFloat(o.shipping_fee || 0) + (p * 0.12));
      let net = p - e;
      if (o.statuses?.some(s => s.toLowerCase() === 'returned')) net = (p - e) * -1;
      return `${o.order_id},${new Date(o.created_at_daraz || o.created_at).toLocaleDateString()},${o.customer_first_name || 'Guest'},${o.statuses?.[0]},${o.account_name},${p},${o.shipping_fee || 0},${net.toFixed(2)}`;
    });
    const blob = new Blob([[headers, ...csvData].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Daraz_Export_${dateRange}_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center ">
      <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-slate-400 mt-4 tracking-widest uppercase text-xs">Loading Dashboard...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className=" min-h-screen font-sans bg-slate-50/20">
      
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
        
        {/* HEADER & GLOBAL FILTERS */}
        <header className="mb-8 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-blue-900 p-3 rounded-2xl shadow-lg">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 leading-none">Daraz  Orders</h1>
                <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-tighter">Real-time Performance Monitoring</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md">
                <Download size={14} /> Export CSV
              </button>
              <StatusMultiSelect selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses} />
              <CustomSelect 
                icon={Store} value={selectedStore} onChange={setSelectedStore}
                options={availableStores.map(s => ({ value: s, label: s === 'all' ? 'All Stores' : s }))}
              />
              <CustomSelect 
                icon={CalendarIcon} value={dateRange} onChange={(val) => {setDateRange(val); setCurrentPage(1);}}
                options={[
                  { value: "thisMonth", label: "This Month" },
                  { value: "lastMonth", label: "Last Month" },
                  { value: "yearMonth", label: "Filter by Year/Month" },
                  { value: "custom", label: "Custom Date Range" },
                  { value: "today", label: "Today" },
                  { value: "7d", label: "Last 7 Days" },
                  { value: "30d", label: "Last 30 Days" },
                  { value: "all", label: "Lifetime History" },
                ]}
              />
            </div>
          </div>

          <AnimatePresence>
            {(dateRange === "custom" || dateRange === "yearMonth") && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                {dateRange === "custom" && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase">From:</span>
                      <DatePicker selected={startDate} onChange={d => setStartDate(d)} placeholderText="Start Date" className="date-input-custom" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase">To:</span>
                      <DatePicker selected={endDate} onChange={d => setEndDate(d)} placeholderText="End Date" className="date-input-custom" minDate={startDate} />
                    </div>
                  </>
                )}
                {dateRange === "yearMonth" && (
                  <>
                    <CustomSelect icon={CalendarDays} width="w-[140px]" value={selectedYear} onChange={setSelectedYear} options={years} />
                    <CustomSelect icon={Layers} width="w-[160px]" value={selectedMonth} onChange={setSelectedMonth} options={months} />
                  </>
                )}
                <button onClick={() => { setDateRange("thisMonth"); setStartDate(null); setEndDate(null); }} className="ml-auto flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase hover:text-rose-700">
                  <RotateCcw size={12} /> Reset Filter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* PRIMARY STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Total Sales" value={`Rs ${dynamicStats.activeRevenue.toLocaleString()}`} icon={<DollarSign className="text-emerald-600" />} colorClass="bg-emerald-50" subText="Pre-Return Sales" />
          <StatCard title=" Net Sales" value={`Rs ${dynamicStats.activeNet.toLocaleString()}`} icon={<TrendingUp className="text-blue-600" />} colorClass="bg-blue-50" subText="Sales - Returns - Fees" />
          <StatCard title="Returns" value={`Rs ${dynamicStats.returnedRevenue.toLocaleString()}`} icon={<RefreshCcw className="text-purple-600" />} colorClass="bg-purple-50" subText={`${dynamicStats.returnedCount} Returned Orders`} />
          <StatCard title=" Fees" value={`Rs ${dynamicStats.activeExpenses.toLocaleString()}`} icon={<CreditCard className="text-rose-600" />} colorClass="bg-rose-50" subText="Tax + Ship + Commission" />
        </div>



        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Net Profit Trend</h3>
            <Chart 
              chartType="AreaChart" 
              width="100%" 
              height="350px" 
              data={areaChartData} 
              options={{ 
                colors: ["#3b82f6", "#f43f5e"], 
                curveType: "function",
                areaOpacity: 0.15,
                chartArea: { width: "90%", height: "75%" }, 
                legend: { position: "bottom" },
                vAxis: { gridlines: { color: "#f1f5f9" } },
                hAxis: { gridlines: { color: "transparent" } },
                lineWidth: 3,
                pointSize: 4
              }} 
            />
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Order Status Split</h3>
            <Chart 
              chartType="PieChart" 
              width="100%" 
              height="350px" 
              data={pieChartData} 
              options={{ 
                pieHole: 0.4, 
                colors: ["#10b981", "#3b82f6", "#6366f1", "#f59e0b", "#f43f5e", "#94a3b8"], 
                legend: { position: "bottom" },
                chartArea: { width: "90%", height: "75%" }
              }} 
            />
          </div>
        </div>

        {/* MONTHLY SUMMARY TABLE - FIXED LOGIC */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Historical Financial Performance</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-6 py-4">Timeline</th><th className="px-6 py-4 text-right">Gross Sales</th><th className="px-6 py-4 text-right text-purple-600">Returns</th><th className="px-6 py-4 text-right text-rose-400">Expenses</th><th className="px-6 py-4 text-right text-blue-900 font-black">Net Profit</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
              {monthlySummary.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{row.year} {row.month}</td>
                  <td className="px-6 py-4 text-right">Rs {row.sales.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-purple-600">- Rs {row.returns.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-rose-400">- Rs {row.exp.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-right font-black ${row.net < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    Rs {row.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SEARCH & TABLE */}
        <div className="mb-6 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            className="w-full pl-14 pr-6 py-4.5 rounded-[22px] border border-slate-200 bg-white shadow-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-700"
            placeholder="Search Order ID, Customer name or Product Title..." 
            onChange={e => {setSearch(e.target.value); setCurrentPage(1);}}
          />
        </div>

        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Info</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Items</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentTableData.map((o) => (
                  <tr key={o.order_id} onClick={() => window.open(`/daraz-orders/${o.order_id}`, "_blank")} className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                    <td className="p-6 align-top">
                      <div className="font-black text-slate-900 text-[15px]">#{o.order_id}</div>
                      <div className="text-[10px] font-black text-blue-500 mt-1 uppercase tracking-tight flex items-center gap-1"><Store size={10} /> {o.account_name}</div>
                    </td>
                    <td className="p-6 align-top">
                      <div className="space-y-3 max-w-[350px]">
                        {o.products?.slice(0, 2).map((prod, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                            <img src={prod.image} className="w-10 h-10 rounded-lg object-cover bg-white" onError={(e) => { e.target.src = "https://via.placeholder.com/100"; }} />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 line-clamp-1 leading-tight">{prod.product_name || prod.title}</p>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">SKU: {prod.sku?.split('-')[0]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-6 align-top">
                      <div className="font-bold text-slate-700">{o.address_shipping?.first_name || o.customer_first_name || 'Guest'}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5"><CalendarDays size={12} /> {new Date(o.created_at_daraz || o.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-6 text-center align-top"><StatusBadge status={o.statuses?.[0]} /></td>
                    <td className="p-6 text-right align-top"><div className="font-black text-blue-900 text-base italic tracking-tighter">Rs {parseFloat(o.price || 0).toLocaleString()}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {currentTableData.length} of {filteredOrders.length} Orders</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                <ChevronLeft size={18} className="text-blue-900" />
              </button>
              <div className="px-4 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-black shadow-lg">Page {currentPage} of {totalPages || 1}</div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                <ChevronRight size={18} className="text-blue-900" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}