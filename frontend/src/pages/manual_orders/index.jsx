import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, MessageSquare, Pencil, Trash2, XCircle, Search, Plus, ChevronDown } from "lucide-react";
import API, { SKU_IMAGE_API_BASE_URL } from "../../config/api";

const OrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [selectedImg, setSelectedImg] = useState(null);
  const [search, setSearch] = useState("");

  const [dateFilter, setDateFilter] = useState("7");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState([]); 
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const navigate = useNavigate();

  const options = [
    { label: "Last 7 Days", value: "7" },
    { label: "Last 30 Days", value: "30" },
    { label: "Last 90 Days", value: "90" },
    { label: "Custom Range", value: "custom" },
  ];

  const statusOptions = ["Pending", "In Progress", "Delivered", "Cancelled"];

  const fetchOrders = useCallback(async () => {
    const res = await API.get("/orders/all");
    setOrders(res.data.data || []);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const parseImages = (sku_images) => {
    if (!sku_images) return [];
    return sku_images.split(",").map((item) => {
      const [sku, image] = item.split("||");
      return { sku, image };
    });
  };

  const parseSkuQty = (sku_qty) => {
    if (!sku_qty) return [];
    return sku_qty.split(", ");
  };

  const parseItems = (items) => {
    if (!items) return [];
    try {
      const parsed = JSON.parse(items);
      const grouped = {};
      parsed.forEach((item) => {
        if (!grouped[item.sku]) {
          grouped[item.sku] = { ...item, qty: Number(item.qty) };
        } else {
          grouped[item.sku].qty += Number(item.qty);
        }
      });
      return Object.values(grouped);
    } catch (e) {
      return [];
    }
  };

  const renderProductTitle = (items) => {
    const parsed = parseItems(items);
    if (parsed.length === 0) return "Product Title...";
    if (parsed.length === 1) return parsed[0].product_name;
    return (
      <div className="space-y-0.5">
        <div className="text-[13px] font-medium">
          <label className="text-[15px] font-[700]">Multi Line Orders</label>
        </div>
      </div>
    );
  };

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "pending": return { label: "Pending", style: "bg-red-600 text-white" };
      case "processing":
      case "in progress": return { label: "In Progress", style: "bg-yellow-500 text-white" };
      case "delivered": return { label: "Delivered", style: "bg-green-600 text-white" };
      case "cancelled":
      case "returned": return { label: "Cancelled", style: "bg-gray-700 text-white" };
      default: return { label: status || "Pending", style: "bg-gray-600 text-white" };
    }
  };

  const filterByDate = (o) => {
    const orderDate = new Date(o.created_at);
    if (dateFilter === "custom") {
      if (!fromDate || !toDate) return true;
      return orderDate >= new Date(fromDate) && orderDate <= new Date(toDate);
    }
    const days = Number(dateFilter);
    const past = new Date();
    past.setDate(past.getDate() - days);
    return orderDate >= past;
  };

  const filteredOrders = orders.filter((o) => {
    const s = search.toLowerCase();
    const match =
      o.order_id?.toLowerCase().includes(s) ||
      o.customer_name?.toLowerCase().includes(s) ||
      o.phone_1?.includes(s) ||
      o.city?.toLowerCase().includes(s) ||
      o.province?.toLowerCase().includes(s) ||
      o.address_line1?.toLowerCase().includes(s) ||
      o.address_line2?.toLowerCase().includes(s) ||
      o.sku_qty?.toLowerCase().includes(s);

    const currentStatusLabel = getStatusConfig(o.order_status).label;
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(currentStatusLabel);

    return match && filterByDate(o) && statusMatch;
  });

  const toggleStatus = (status) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[1600px] mx-auto pt-6">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 mb-8">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Total Orders</div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="font-black text-2xl text-slate-900">{filteredOrders.length}</div>
           
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Total Revenue</div>
            <div className="font-black text-2xl text-slate-900 mt-1 flex items-baseline gap-1">
              <span className="text-sm font-bold">Rs</span>
              {filteredOrders.reduce((s, o) => s + Number(o.order_total || 0), 0).toLocaleString()}
               <span>.00</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Success Rate</div>
            <div className="font-black text-2xl text-green-600 mt-1">
              {filteredOrders.filter((o) => o.order_status?.toLowerCase() === "delivered").length}
              <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-700" 
                  style={{ width: `${(filteredOrders.filter(o => o.order_status?.toLowerCase() === "delivered").length / (filteredOrders.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex items-center justify-between mb-4 px-4 gap-4">
          <div className="relative flex items-center max-w-md w-full">
            <input
              type="text"
              placeholder="Search (Phone / Address / SKU / City...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl transition-all focus:ring-4 focus:ring-blue-50 focus:border-blue-400 focus:outline-none shadow-sm"
            />
            <Search className="absolute left-3 text-slate-400" size={16} />
          </div>

          <div className="flex items-center gap-3 ">
            {/* STATUS FILTER */}
            <div className="relative hover:cursor-pointer ">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="flex items-center justify-between min-w-[140px] bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm rounded-xl shadow-sm hover:border-blue-400 transition-all"
              >
                <span className="truncate text-xs font-semibold">{statusFilter.length === 0 ? "All Status" : `${statusFilter.length} Selected`}</span>
                <ChevronDown className={`w-3 h-3 ml-2 text-slate-400 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStatusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                  <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1 animate-in fade-in zoom-in-95">
                    {statusOptions.map((status) => (
                      <label key={status} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={statusFilter.includes(status)} onChange={() => toggleStatus(status)} />
                        {status}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* DATE FILTER */}
            <div className="relative ">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between min-w-[150px]  bg-white border border-slate-200 text-slate-700 px-4 py-2 text-sm rounded-xl shadow-sm hover:border-blue-400 transition-all"
              >
                <span className="text-xs font-semibold cursor-pointer">{options.find(opt => opt.value === dateFilter)?.label}</span>
                <ChevronDown className={`w-3 h-3 ml-2 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute right-0 z-20 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden p-1 animate-in fade-in zoom-in-95">
                    {options.map((option) => (
                      <button key={option.value} onClick={() => { setDateFilter(option.value); setIsDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 text-xs rounded-lg transition-colors ${dateFilter === option.value ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-2 cursor-pointer">
                <input type="date" onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-xs p-1 outline-none" />
                <span className="text-slate-300 text-[10px] font-bold uppercase tracking-tighter">to</span>
                <input type="date" onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-xs p-1 outline-none" />
              </div>
            )}

            <button
              onClick={() => navigate("/create-manual-orders")}
              className="bg-[#0f172a] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={14} strokeWidth={3} /> Create Order
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div className="grid grid-cols-12 px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-100 mb-2">
          <div className="col-span-7">Order Details</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* ORDERS LIST */}
        <div className="space-y-4 px-4">
          {filteredOrders.map((o) => {
            const images = parseImages(o.sku_images);
            const skuItems = parseSkuQty(o.sku_qty);
            const statusConfig = getStatusConfig(o.order_status);
            return (
              <div key={o.order_id} className="relative bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group">
                <div className={`absolute top-0 right-0 px-4 py-1 text-[11px] font-[500] uppercase  rounded-bl-[7px] shadow-sm ${statusConfig.style}`}>
                  {statusConfig.label}
                </div>

                <div className="grid grid-cols-12 items-start">
                  <div className="col-span-7 pr-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span onClick={() => navigate(`/orders/view/${o.order_id}`)} className="text-blue-600 font-[500] cursor-pointer hover:underline text-sm tracking-tight tracking-wide">
                        #{o.order_id}
                      </span>
                      {skuItems.map((item, i) => {
                        const [sku, qty] = item.split(" x");
                        return (
                          <div key={i} className="flex items-center gap-1.5 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {sku} <span className="text-slate-400 font-medium">× {qty}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div onClick={() => navigate(`/orders/view/${o.order_id}`)} className="text-[13px] text-slate-700 font-[500] mb-4 cursor-pointer group-hover:text-blue-600 transition-colors hover:underline">
                      {renderProductTitle(o.items)}
                    </div>
                    <div className="flex gap-2 p-2 border border-slate-50 rounded-xl bg-slate-50/50 w-fit">
                      {images.map((imgObj, i) => (
                        <img key={i} src={imgObj.image ? `${SKU_IMAGE_API_BASE_URL}/images/productimage/${imgObj.sku}/${imgObj.image}` : "/images/no-image.png"} className="w-12 h-12 object-cover bg-white border border-slate-100 rounded-lg hover:scale-250 transition-transform shadow-sm" alt="product" />
                      ))}
                    </div>
                  </div>

                  <div className="col-span-3 text-[13px] pt-1 border-l border-slate-50 pl-6">
                    <div className="text-slate-900 font-bold mb-1 truncate">{o.customer_name || "Guest Customer"}</div>
               
                    <div className="text-slate-500 text-[11px] leading-relaxed mt-1">
                      {o.address_line1}<br />
                          
                      {o.city || "Jaffna"} <br />
                    
                      <span className="font-medium text-slate-800 tracking-tight">{o.phone_1}</span>
                    </div>
                  </div>

                  <div className="col-span-1 pt-1 text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total</div>
                    <div className="font-mono font-black text-sm text-slate-900">
                      £{Number(o.order_total).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-span-1 pt-8 flex justify-end gap-4 text-slate-300 group-hover:text-slate-500 transition-colors">
                    <MessageSquare size={16} className="cursor-pointer hover:text-blue-500" />
                    <Pencil size={16} className="cursor-pointer hover:text-yellow-600" />
                    <Trash2 size={16} className="cursor-pointer hover:text-red-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedImg && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedImg(null)}>
          <img src={selectedImg} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white" alt="Preview" />
          <XCircle size={32} className="absolute top-5 right-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default OrderDashboard;