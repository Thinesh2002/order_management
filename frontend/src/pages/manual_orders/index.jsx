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
  
  // ✅ ADDED: State for custom dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ✅ ADDED: Options array defined inside component
  const options = [
    { label: "Last 7 Days", value: "7" },
    { label: "Last 30 Days", value: "30" },
    { label: "Last 90 Days", value: "90" },
    { label: "Custom Range", value: "custom" },
  ];

  const navigate = useNavigate();

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
    return match && filterByDate(o);
  });

  return (
    <div className="">
      <div className="">
        <div className="grid grid-cols-3 gap-3 px-4 mb-10">
          <div className="border p-3 text-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <div className="text-gray-500 text-xs tracking-wide">Total Orders</div>
            <div className="font-bold text-xl text-gray-900 mt-1 animate-fadeIn">{filteredOrders.length}</div>
          </div>
          <div className="border p-3 text-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <div className="text-gray-500 text-xs tracking-wide">Total Amount</div>
            <div className="font-bold text-xl text-gray-900 mt-1 animate-fadeIn">
              £{filteredOrders.reduce((s, o) => s + Number(o.order_total || 0), 0)}
            </div>
          </div>
          <div className="border p-3 text-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <div className="text-gray-500 text-xs tracking-wide">Delivered</div>
            <div className="font-bold text-xl text-green-600 mt-1 animate-fadeIn">
              {filteredOrders.filter((o) => o.order_status?.toLowerCase() === "delivered").length}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-4">
          <div className="relative group flex items-center max-w-md w-full">
            <input
              type="text"
              placeholder="Search (Phone / Address / SKU / City...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none placeholder-gray-400 hover:bg-gray-100 focus:hover:bg-white"
            />
            <Search className="absolute left-3 text-gray-400" size={16} />
          </div>

          <div className="flex flex-wrap items-center gap-4 p-2">
            {/* ✅ FIXED MODERN DROPDOWN */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between min-w-[160px] bg-white border border-gray-200 text-gray-700 px-4 py-2 text-sm rounded-xl shadow-sm transition-all duration-300 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-50/50"
              >
                <span>{options.find(opt => opt.value === dateFilter)?.label}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute right-0 z-20 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                      {options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => { setDateFilter(option.value); setIsDropdownOpen(false); }}
                          className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${dateFilter === option.value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="group relative">
                  <input type="date" onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-600 px-3 py-2 text-sm rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 outline-none transition-all duration-200" />
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400 uppercase tracking-wider font-bold">From</span>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                  <span className="text-gray-400 text-xs font-medium">to</span>
                </div>
                <div className="group relative">
                  <input type="date" onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-600 px-3 py-2 text-sm rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 outline-none transition-all duration-200" />
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400 uppercase tracking-wider font-bold">To</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/create-manual-orders")}
            className="bg-black text-white px-4 py-1.5 rounded-md text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Create Manual Order
          </button>
        </div>

        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200 mb-2">
          <div className="col-span-7">Order Details</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="space-y-3">
          {filteredOrders.map((o) => {
            const images = parseImages(o.sku_images);
            const skuItems = parseSkuQty(o.sku_qty);
            const statusConfig = getStatusConfig(o.order_status);
            return (
              <div key={o.order_id} className="relative bg-white border border-gray-200 rounded-sm p-4 hover:border-gray-300 transition-colors">
                <div className={`absolute top-0 right-0 px-3 py-0.5 text-[10px] font-bold uppercase rounded-bl-sm ${statusConfig.style}`}>{statusConfig.label}</div>
                <div className="grid grid-cols-12 items-start">
                  <div className="col-span-7 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span onClick={() => navigate(`/orders/view/${o.order_id}`)} className="text-blue-500 font-semibold cursor-pointer hover:underline text-sm">{o.order_id}</span>
                      {skuItems.map((item, i) => {
                        const [sku, qty] = item.split(" x");
                        return (
                          <div key={i} className="flex items-center gap-1">
                            <span className="bg-[#1a1a1a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{sku}</span>
                            <span className="text-xs font-bold text-gray-700">X {qty}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div onClick={() => navigate(`/orders/view/${o.order_id}`)} className="text-[13px] text-gray-700 font-medium mb-3 cursor-pointer hover:text-blue-600">{renderProductTitle(o.items)}</div>
                    <div className="inline-flex gap-3 p-2 border border-gray-200 rounded-md bg-gray-50 min-w-[350px]">
                      {images.map((imgObj, i) => (
                        <img key={i} src={imgObj.image ? `${SKU_IMAGE_API_BASE_URL}/images/productimage/${imgObj.sku}/${imgObj.image}` : "/images/no-image.png"} className="w-12 h-12 object-contain bg-white border border-gray-100 rounded" alt="product" />
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3 text-sm pt-1 border-l border-gray-50 pl-4">
                    <div className="text-gray-800 font-medium truncate">{o.customer_name || "Guest Customer"}</div>
                    <div className="flex items-center gap-1 font-bold text-gray-900 mt-0.5 text-xs">{o.city || "Jaffna"} <Copy size={12} className="text-gray-400 cursor-pointer" /></div>
                    <div className="text-gray-500 text-[11px] leading-tight mt-1 truncate">{o.address_line1 || "Pandiyanthalvu road"}<br />{o.city} {o.province}<br />{o.phone_1}</div>
                  </div>
                  <div className="col-span-1 pt-1 text-right">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total</div>
                    <div className="font-mono font-bold text-sm text-gray-900">£{o.order_total}</div>
                  </div>
                  <div className="col-span-1 pt-8 flex justify-end gap-3 text-gray-400">
                    <MessageSquare size={16} className="cursor-pointer" />
                    <Pencil size={16} className="cursor-pointer" />
                    <Trash2 size={16} className="cursor-pointer" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedImg(null)}>
          <img src={selectedImg} className="max-w-full max-h-full rounded shadow-2xl" alt="Preview" />
          <XCircle size={32} className="absolute top-5 right-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default OrderDashboard;