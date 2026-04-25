import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../../../config/api";
import { motion } from "framer-motion";
import { User, Package, Calendar, CreditCard, Plus, Trash2, ArrowLeft, Save } from "lucide-react";

function EditManualOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [customer, setCustomer] = useState({
    customer_id: "", customer_name: "", company_name: "", phone_1: "",
    email: "", address_line1: "", address_line2: "", city: "", province: ""
  });

  const [order, setOrder] = useState({
    order_id: "", order_date: today, payment_method: "COD", note: "",
    item_total: 0, discount: 0, subtotal: 0, shipping_cost_fixed: 400,
    tax_percent: 0, order_total: 0
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const res = await API.get("/orders/all");
      const orderData = res.data.data.find(o => o.order_id === id);
      if (!orderData) return;

      setOrder({
        ...order,
        ...orderData,
        order_date: orderData.order_date
          ? new Date(orderData.order_date).toISOString().split("T")[0]
          : ""
      });

      setCustomer({
        customer_id: orderData.customer_code,
        customer_name: orderData.customer_name,
        phone_1: orderData.phone_1,
        address_line1: orderData.address_line1,
        address_line2: orderData.address_line2,
        city: orderData.city,
        province: orderData.province
      });

      const itemsRes = await API.get(`/orders/items/${id}`);
      setItems(
        (itemsRes.data.data || []).map(i => ({
          sku: i.sku || "",
          product_name: i.product_name || "",
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
          item_total: Number(i.item_total) || 0
        }))
      );
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    calculateTotals();
  }, [items, order.discount, order.shipping_cost_fixed, order.tax_percent]);

  const calculateTotals = () => {
    const itemTotal = items.reduce((sum, i) => sum + Number(i.item_total || 0), 0);
    const subtotal = itemTotal - Number(order.discount || 0);
    const taxAmount = (subtotal * Number(order.tax_percent || 0)) / 100;
    const total = subtotal + Number(order.shipping_cost_fixed || 0) + taxAmount;
    setOrder(prev => ({ ...prev, item_total: itemTotal, subtotal, order_total: total }));
  };

  const handleCustomer = (e) => setCustomer({ ...customer, [e.target.name]: e.target.value });

  const handleItemChange = (index, e) => {
    const updated = [...items];
    updated[index][e.target.name] = e.target.value;
    updated[index].item_total = (Number(updated[index].quantity) || 0) * (Number(updated[index].unit_price) || 0);
    setItems(updated);
  };

  const addItem = () => setItems([...items, { sku: "", product_name: "", quantity: 1, unit_price: 0, item_total: 0 }]);
  const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

  const updateOrder = async () => {
    try {
      let customer_id = customer.customer_id;
      if (!customer_id) {
        const res = await API.post("/customers/create", customer);
        customer_id = res.data.data.id;
      }
      await API.put(`/orders/update/${id}`, {
        order: {
          ...order,
          customer_code: customer_id || null,
          note: order.note || "",
          order_date: order.order_date ? `${order.order_date} 00:00:00` : null,
          item_total: Number(order.item_total) || 0,
          discount: Number(order.discount) || 0,
          subtotal: Number(order.subtotal) || 0,
          shipping_cost_fixed: Number(order.shipping_cost_fixed) || 0,
          order_total: Number(order.order_total) || 0
        },
items: items
  .filter(i => i.product_name && Number(i.quantity) > 0) // ✅ FIX
  .map(i => ({
    sku: i.sku || null,
    product_name: i.product_name,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price) || 0,
    item_total: Number(i.quantity) * (Number(i.unit_price) || 0)
  }))
      });
      alert("Order updated successfully");
      navigate(-1);
    } catch (err) {
  console.log("ERROR:", err.response?.data); 
  alert(err?.response?.data?.message || "Error updating order");
}
  };

  const labelClass = "text-xs font-bold text-slate-500 uppercase mb-1 block";
  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all";

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-500" />
            </button>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Edit Manual Order</h1>
          </div>
          <div className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
            ID: {order.order_id}
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* LEFT: CUSTOMER INFO */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-4 tracking-wide uppercase">
                <User size={16} /> Customer Information
              </h3>
              
              <div>
                <label className={labelClass}>Name</label>
                <input name="customer_name" value={customer.customer_name} onChange={handleCustomer} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Phone</label>
                <input name="phone_1" value={customer.phone_1} onChange={handleCustomer} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Shipping Address</label>
                <div className="space-y-2">
                  <input name="address_line1" value={customer.address_line1} onChange={handleCustomer} className={inputClass} placeholder="Line 1" />
                  <input name="address_line2" value={customer.address_line2} onChange={handleCustomer} className={inputClass} placeholder="Line 2" />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="city" value={customer.city} onChange={handleCustomer} className={inputClass} placeholder="City" />
                    <input name="province" value={customer.province} onChange={handleCustomer} className={inputClass} placeholder="Province" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: ORDER INFO */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-4 tracking-wide uppercase">
                <Calendar size={16} /> Order Logistics
              </h3>

              <div>
                <label className={labelClass}>Date</label>
                <input type="date" value={order.order_date} onChange={(e)=>setOrder({...order, order_date:e.target.value})} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Payment Method</label>
                <div className="relative">
                  <input value={order.payment_method} onChange={(e)=>setOrder({...order, payment_method:e.target.value})} className={inputClass} />
                  <CreditCard className="absolute right-3 top-2.5 text-slate-400" size={16} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Note</label>
                <textarea
                  className={`${inputClass} h-[118px] resize-none py-2`}
                  value={order.note || ""}
                  onChange={(e)=>setOrder({...order, note:e.target.value})}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
          </div>

          {/* ITEMS SECTION */}
          <div className="mt-12">
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-blue-600 tracking-wide uppercase">
                <Package size={16} /> Order Items
              </h3>
              <button onClick={addItem} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-2">
                <Plus size={14} /> Add Product
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-300">
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">SKU</label>
                    <input className="w-full bg-transparent outline-none text-sm px-1 font-medium" name="sku" value={item.sku} onChange={(e)=>handleItemChange(i,e)} />
                  </div>
                  <div className="col-span-4 border-l border-slate-100 pl-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Product Name</label>
                    <input className="w-full bg-transparent outline-none text-sm px-1 font-medium" name="product_name" value={item.product_name} onChange={(e)=>handleItemChange(i,e)} />
                  </div>
                  <div className="col-span-2 border-l border-slate-100 pl-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-center block">Qty</label>
                    <input type="number" className="w-full bg-transparent outline-none text-sm px-1 text-center font-bold" name="quantity" value={item.quantity} onChange={(e)=>handleItemChange(i,e)} />
                  </div>
                  <div className="col-span-2 border-l border-slate-100 pl-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-right block">Price</label>
                    <input type="number" className="w-full bg-transparent outline-none text-sm px-1 text-right font-mono" name="unit_price" value={item.unit_price} onChange={(e)=>handleItemChange(i,e)} />
                  </div>
                  <button onClick={()=>removeItem(i)} className="col-span-1 flex justify-center text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TOTALS SECTION */}
          <div className="mt-10 flex justify-end">
            <div className="w-full md:w-80 bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
              <div className="flex justify-between text-sm font-medium text-slate-500 uppercase tracking-tighter">
                <span>Item Total</span>
                <span className="text-slate-900 font-mono">Rs {Number(order.item_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-slate-500 uppercase tracking-tighter">
                <span>Discount</span>
                <input className="w-24 text-right bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 font-mono" value={order.discount} onChange={(e)=>setOrder({...order, discount:e.target.value})}/>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-500 uppercase tracking-tighter">
                <span>Subtotal</span>
                <span className="text-slate-900 font-mono">Rs {Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-slate-500 uppercase tracking-tighter border-b border-slate-200 pb-3">
                <span>Shipping</span>
                <input className="w-24 text-right bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 font-mono" value={order.shipping_cost_fixed} onChange={(e)=>setOrder({...order, shipping_cost_fixed:e.target.value})}/>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-slate-800 uppercase">Grand Total</span>
                <span className="text-xl font-black text-blue-600 font-mono">Rs {Number(order.order_total).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button onClick={updateOrder} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95 uppercase text-xs tracking-widest">
            <Save size={18} /> Update Order
          </button>
        </div>

      </motion.div>
    </div>
  );
}

export default EditManualOrder;