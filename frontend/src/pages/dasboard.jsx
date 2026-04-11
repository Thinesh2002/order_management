import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart } from "react-google-charts";
import API from "../config/api";
import { 
  Plus, ShoppingCart, CheckCircle, Clock, 
  AlertCircle, Activity, TrendingUp, XCircle, RotateCcw, PoundSterling 
} from "lucide-react";

const HomeDashboard = () => {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders/all");
      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const getStatusCount = (status) => 
    orders.filter((o) => o.order_status?.toLowerCase() === status.toLowerCase()).length;

  const totalOrders = orders.length;
  
  // ✅ TOTAL REVENUE / SALES AMOUNT CALCULATION
  const totalSalesAmount = orders.reduce(
    (sum, o) => sum + Number(o.order_total || 0), 0
  );

  const getDailySalesData = () => {
    const salesMap = {};
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesMap[dateStr] = 0;
    }

    orders.forEach(o => {
      if (o.created_at) {
        const dateStr = new Date(o.created_at).toISOString().split('T')[0];
        if (salesMap[dateStr] !== undefined) {
          salesMap[dateStr] += Number(o.order_total || 0);
        }
      }
    });

    const data = [["Date", "Sales"]];
    Object.keys(salesMap).sort().forEach(date => {
      const formattedDate = new Date(date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
      });
      data.push([formattedDate, salesMap[date]]);
    });

    return data.length > 1 ? data : [["Date", "Sales"], ["No Data", 0]];
  };

  const pieData = [
    ["Status", "Count"],
    ["Delivered", getStatusCount("delivered")],
    ["Pending", getStatusCount("pending")],
    ["Processing", getStatusCount("processing")],
    ["Cancelled", getStatusCount("cancelled")],
    ["Returned", getStatusCount("return")],
  ];

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen space-y-8 animate-in fade-in duration-500">
      
      {/* ✅ STATS CARDS (Updated to 7 columns to include Sales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          { label: "Total Orders", value: totalOrders, icon: <ShoppingCart size={18}/>, color: "blue" },
          
          // ✅ NEW SALES AMOUNT CARD
          { label: "Total Sales", value: `£${totalSalesAmount.toLocaleString()}`, icon: <PoundSterling size={18}/>, color: "emerald" },

          { label: "Processing", value: getStatusCount("processing"), icon: <Clock size={18}/>, color: "indigo" },
          { label: "Pending", value: getStatusCount("pending"), icon: <AlertCircle size={18}/>, color: "orange" },
          { label: "Delivered", value: getStatusCount("delivered"), icon: <CheckCircle size={18}/>, color: "green" },
          { label: "Cancelled", value: getStatusCount("cancelled"), icon: <XCircle size={18}/>, color: "red" },
          { label: "Returned", value: getStatusCount("return"), icon: <RotateCcw size={18}/>, color: "slate" }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-default">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <div className={`p-1.5 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:bg-${stat.color}-600 group-hover:text-white transition-all`}>
                {stat.icon}
              </div>
              {stat.label}
            </div>
            <div className="text-xl font-black text-slate-900 mt-3 tracking-tight">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* GRAPHS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tight">
              <TrendingUp size={16} className="text-blue-500" /> 30-Day Sales Trend
            </div>
            <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded tracking-tighter uppercase">Last 30 Days</div>
          </div>
          <Chart
            chartType="AreaChart"
            width="100%"
            height="300px"
            data={getDailySalesData()}
            options={{
              colors: ["#3b82f6"],
              areaOpacity: 0.1,
              backgroundColor: "transparent",
              chartArea: { width: "92%", height: "70%" },
              vAxis: { gridlines: { color: "#f1f5f9" }, textStyle: { fontSize: 10, color: "#94a3b8" } },
              hAxis: { textStyle: { fontSize: 9, color: "#94a3b8" }, showTextEvery: 5 },
              legend: { position: "none" },
              animation: { startup: true, duration: 1000, easing: "out" }
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 font-black text-slate-800 uppercase text-xs tracking-tight">
            <Activity size={16} className="text-indigo-500" /> Status Breakdown
          </div>
          <Chart
            chartType="PieChart"
            width="100%"
            height="300px"
            data={pieData}
            options={{
              pieHole: 0.5,
              colors: ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#64748b"],
              chartArea: { width: "100%", height: "80%" },
              legend: { position: "bottom", textStyle: { fontSize: 10, color: "#64748b" } },
            }}
          />
        </div>
      </div>

      {/* RECENT ORDERS TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/10">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</div>
          <button onClick={() => navigate("/orders")} className="text-blue-600 text-[10px] font-black uppercase hover:underline">View All</button>
        </div>
        <div className="divide-y divide-slate-50">
          {orders.slice(0, 5).map((o) => (
            <div key={o.order_id} className="flex justify-between items-center px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`/orders/view/${o.order_id}`)}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors">#{o.order_id}</div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase">{o.customer_name || "Guest"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 text-sm tracking-tighter font-mono">Rs {o.order_total}/=</div>
                <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block ${
                  o.order_status?.toLowerCase() === 'delivered' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {o.order_status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => navigate("/create-manual-orders")}
        className="fixed bottom-8 right-8 bg-[#0f172a] text-white px-6 py-3 rounded-2xl shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2 font-black text-xs tracking-widest uppercase"
      >
        <Plus size={18} strokeWidth={3} />
        New Order
      </button>

    </div>
  );
};

export default HomeDashboard;