import { useEffect, useState } from "react";
import API from "../../../config/api";
import { motion } from "framer-motion";
import { TrendingUp, Package } from "lucide-react";

export default function ProductTrendPage() {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrend();
  }, []);

  const fetchTrend = async () => {
    try {
      const res = await API.get("/daraz/analytics/product-moving-trend");
      setProducts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 max-w-[1600px] mx-auto"
    >

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-900 p-3 rounded-2xl">
          <TrendingUp className="text-white" size={22} />
        </div>
        <h1 className="text-2xl font-black">Product Moving Trend Analytics</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-sm">
            <thead className="bg-slate-50 uppercase text-[11px] text-slate-500">
              <tr>
                <th className="p-5 text-left">Product</th>
                <th className="p-5 text-center">30D Orders</th>
                <th className="p-5 text-center">90D Orders</th>
                <th className="p-5 text-center">30D Qty</th>
                <th className="p-5 text-center">Total Qty</th>
                <th className="p-5 text-center">Total Sales</th>
                <th className="p-5 text-center">Growth %</th>
                <th className="p-5 text-center">Speed</th>
                <th className="p-5 text-center">Next 30D Prediction</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {products.map((p, index) => (
                <tr key={index} className="hover:bg-slate-50 transition">

                  {/* PRODUCT COLUMN WITH IMAGE */}
                  <td className="p-5">
                    <div className="flex items-center gap-4">

                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={p.product_image || "https://via.placeholder.com/150"}
                          alt="product"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      </div>

                      <div>
                        <div className="font-bold text-slate-800">
                          {p.product_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          SKU: {p.sku}
                        </div>
                      </div>

                    </div>
                  </td>

                  <td className="p-5 text-center font-semibold">
                    {p.last_30_days_orders}
                  </td>

                  <td className="p-5 text-center">
                    {p.last_90_days_orders}
                  </td>

                  <td className="p-5 text-center font-bold text-blue-600">
                    {p.last_30_days_qty}
                  </td>

                  <td className="p-5 text-center">
                    {p.total_quantity_sold}
                  </td>

                  <td className="p-5 text-center font-bold text-indigo-600">
                    Rs {p.total_sales_amount.toLocaleString()}
                  </td>

                  <td className={`p-5 text-center font-bold ${
                    p.growth_rate > 0
                      ? "text-emerald-600"
                      : "text-rose-500"
                  }`}>
                    {p.growth_rate}%
                  </td>

                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold
                      ${p.movement_speed === "Fast"
                        ? "bg-emerald-100 text-emerald-700"
                        : p.movement_speed === "Medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                      {p.movement_speed}
                    </span>
                  </td>

                  <td className="p-5 text-center font-black text-purple-600">
                    {p.predicted_next_30_days}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-20 text-slate-400 font-bold">
            No product trend data found
          </div>
        )}
      </div>

    </motion.div>
  );
}
