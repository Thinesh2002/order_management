import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, MessageSquare, Pencil, Trash2, XCircle } from "lucide-react";
import API, { SKU_IMAGE_API_BASE_URL } from "../../config/api";

const OrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [selectedImg, setSelectedImg] = useState(null);
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
          grouped[item.sku] = {
            ...item,
            qty: Number(item.qty)
          };
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

    if (parsed.length === 1) {
      return parsed[0].product_name;
    }

    return (
      <div className="space-y-0.5">
        <div className="text-[13px] font-medium">
          <label className="text-[15px] font-[700]">
            Multi Line Orders
          </label>
        </div>
      </div>
    );
  };

  // ✅ UPDATED STATUS FUNCTION (FOR order_status)
  const getStatusConfig = (status) => {
    const s = status?.toLowerCase();

    switch (s) {
      case "pending":
        return { label: "Pending", style: "bg-red-600 text-white" };

      case "processing":
      case "in progress":
        return { label: "In Progress", style: "bg-yellow-500 text-white" };

      case "delivered":
        return { label: "Delivered", style: "bg-green-600 text-white" };

      case "cancelled":
      case "returned":
        return { label: "Cancelled", style: "bg-gray-700 text-white" };

      default:
        return { label: status || "Pending", style: "bg-gray-600 text-white" };
    }
  };

  return (
    <div className="">
      <div className="">
        
        {/* HEADER */}
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200 mb-2">
          <div className="col-span-7">Order Details</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* ORDERS */}
        <div className="space-y-3">
          {orders.map((o) => {
            const images = parseImages(o.sku_images);
            const skuItems = parseSkuQty(o.sku_qty);

            // ✅ USE order_status HERE
            const statusConfig = getStatusConfig(o.order_status);

            return (
              <div key={o.order_id} className="relative bg-white border border-gray-200 rounded-sm p-4 hover:border-gray-300 transition-colors">
                
                {/* STATUS */}
                <div className={`absolute top-0 right-0 px-3 py-0.5 text-[10px] font-bold uppercase rounded-bl-sm ${statusConfig.style}`}>
                  {statusConfig.label}
                </div>

                <div className="grid grid-cols-12 items-start">
                  
                  {/* ORDER DETAILS */}
                  <div className="col-span-7 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span 
                        onClick={() => navigate(`/orders/view/${o.order_id}`)}
                        className="text-blue-500 font-semibold cursor-pointer hover:underline text-sm"
                      >
                        {o.order_id}
                      </span>

                      {skuItems.map((item, i) => {
                        const [sku, qty] = item.split(" x");
                        return (
                          <div key={i} className="flex items-center gap-1">
                            <span className="bg-[#1a1a1a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              {sku}
                            </span>
                            <span className="text-xs font-bold text-gray-700">X {qty}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* TITLE */}
                    <div 
                      onClick={() => navigate(`/orders/view/${o.order_id}`)}
                      className="text-[13px] text-gray-700 font-medium mb-3 cursor-pointer hover:text-blue-600"
                    >
                      {renderProductTitle(o.items)}
                    </div>

                    {/* IMAGES */}
                    <div className="inline-flex gap-3 p-2 border border-gray-200 rounded-md bg-gray-50 min-w-[350px]">
                      {images.map((imgObj, i) => (
                        <img
                          key={i}
                          onClick={() =>
                            setSelectedImg(
                              imgObj.image
                                ? `${SKU_IMAGE_API_BASE_URL}/images/productimage/${imgObj.sku}/${imgObj.image}`
                                : "/images/no-image.png"
                            )
                          }
                          src={
                            imgObj.image
                              ? `${SKU_IMAGE_API_BASE_URL}/images/productimage/${imgObj.sku}/${imgObj.image}`
                              : "/images/no-image.png"
                          }
                          className="w-12 h-12 object-contain bg-white border border-gray-100 rounded cursor-pointer hover:border-blue-400"
                          alt="product"
                        />
                      ))}
                    </div>
                  </div>

                  {/* CUSTOMER */}
                  <div className="col-span-3 text-sm pt-1 border-l border-gray-50 pl-4">
                    <div className="text-gray-800 font-medium truncate">
                      {o.customer_name || "Guest Customer"}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-gray-900 mt-0.5 text-xs">
                      {o.city || "Jaffna"} <Copy size={12} className="text-gray-400 cursor-pointer hover:text-blue-500" />
                    </div>
                    <div className="text-gray-500 text-[11px] leading-tight mt-1 truncate">
                      {o.address_line1 || "Pandiyanthalvu road"}
                    </div>
                  </div>

                  {/* TOTAL */}
                  <div className="col-span-1 pt-1 text-right">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total</div>
                    <div className="font-mono font-bold text-sm text-gray-900">
                      £{o.order_total}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="col-span-1 pt-8 flex justify-end gap-3 text-gray-400">
                    <MessageSquare size={16} className="cursor-pointer hover:text-blue-500" />
                    <Pencil 
                      size={16} 
                      className="cursor-pointer hover:text-blue-600" 
                      onClick={() => navigate(`/orders/edit/${o.order_id}`)} 
                    />
                    <Trash2 size={16} className="cursor-pointer hover:text-red-500" />
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IMAGE PREVIEW */}
      {selectedImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedImg(null)}>
          <img src={selectedImg} className="max-w-full max-h-full rounded shadow-2xl shadow-blue-500/10" alt="Preview" />
          <XCircle size={32} className="absolute top-5 right-5 text-white opacity-70 hover:opacity-100" />
        </div>
      )}
    </div>
  );
};

export default OrderDashboard;