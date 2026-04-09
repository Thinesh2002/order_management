import React, { useEffect, useState, useCallback } from "react";
import API, { SKU_IMAGE_API_BASE_URL } from "../../config/api";

// ================= IMAGE COMPONENT (MEMO) =================
const OrderImage = React.memo(({ src }) => {
  return (
    <img
      loading="lazy"
      width="48"
      height="48"
      src={src}
      alt="product"
      onError={(e) => {
        e.target.src = "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg";
      }}
      className="w-12 h-12 object-cover rounded-lg border"
    />
  );
});

// ================= MAIN COMPONENT =================
const OrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [openMenu, setOpenMenu] = useState(null);

  // ================= FETCH =================
  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get("/orders/all?limit=20");
      const data = res.data.data || [];

      setOrders(data);
      setFiltered(data);
    } catch (err) {
      console.log("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ================= FILTER =================
  useEffect(() => {
    let data = [...orders];

    if (search) {
      data = data.filter(
        (o) =>
          o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
          (o.customer_name || "")
            .toLowerCase()
            .includes(search.toLowerCase())
      );
    }

    if (status !== "All") {
      data = data.filter((o) => o.order_status === status);
    }

    setFiltered(data);
  }, [search, status, orders]);

  // ================= DELETE =================
  const deleteOrder = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    await API.delete(`/orders/${id}`);
    fetchOrders();
  };

  // ================= ✅ IMAGE PATH =================
  const getImageUrl = (sku, image) => {
    if (!sku || !image) return "/images/no-image.png";

    return `${SKU_IMAGE_API_BASE_URL}/images/productimage/${sku}/${image}`;
  };

  // ================= ✅ EXTRACT SKU (FIX) =================
  const getFirstSku = (sku_qty) => {
    if (!sku_qty) return null;
    return sku_qty.split(" x")[0];
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Order Dashboard
        </h1>

        <div className="flex gap-3">
          <input
            placeholder="Search order / customer..."
            className="px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-gray-400 outline-none"
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="px-4 py-2 border rounded-lg shadow-sm"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4 text-left">Order</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Image</th>
              <th className="p-4 text-left">SKUs</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((o, i) => (
              <tr
                key={o.order_id}
                className="border-t hover:bg-gray-50 transition-all"
              >
                {/* ORDER */}
                <td className="p-4">
                  <div className="font-bold text-gray-800 text-sm">
                    {o.order_id}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {new Date(o.order_date).toLocaleDateString()}
                  </div>
                </td>

                {/* CUSTOMER */}
                <td className="p-4 font-medium">
                  {o.customer_name || "N/A"}
                </td>

                {/* ✅ IMAGE FIX */}
                <td className="p-4">
                  <OrderImage
                    src={getImageUrl(
                      getFirstSku(o.sku_qty),
                      o.preview_image
                    )}
                  />
                </td>

                {/* SKU */}
                <td className="p-4">
                  <div className="flex flex-wrap gap-2 max-w-[280px]">
                    {o.sku_qty ? (
                      <>
                        {o.sku_qty
                          .split(", ")
                          .slice(0, 3)
                          .map((item, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 text-[11px] bg-gray-900 text-white rounded-full"
                            >
                              {item}
                            </span>
                          ))}

                        {o.sku_qty.split(", ").length > 3 && (
                          <span className="text-xs text-gray-500">
                            +
                            {o.sku_qty.split(", ").length - 3} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        No SKU
                      </span>
                    )}
                  </div>
                </td>

                {/* TOTAL */}
                <td className="p-4 font-bold text-gray-800">
                  Rs. {o.order_total}
                </td>

                {/* STATUS */}
                <td className="p-4">
                  <span
                    className={`px-3 py-1 text-[10px] rounded-full font-bold ${
                      o.order_status === "Pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {o.order_status}
                  </span>
                </td>

                {/* ACTION */}
                <td className="p-4 text-right relative">
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === i ? null : i)
                    }
                    className="w-8 h-8 rounded-full hover:bg-gray-200"
                  >
                    ⋮
                  </button>

                  {openMenu === i && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border rounded-xl shadow-lg z-50">
                      <button className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">
                        View Order
                      </button>

                      <button className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">
                        Edit Order
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                      >
                        Print Invoice
                      </button>

                      <button
                        onClick={() => deleteOrder(o.order_id)}
                        className="block w-full px-4 py-2 text-left text-red-500 hover:bg-red-50 text-sm"
                      >
                        Delete Order
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-6 text-gray-400">
                  No Orders Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderDashboard;