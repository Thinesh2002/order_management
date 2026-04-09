import { useState, useEffect } from "react";
import API from "../../../config/api";
import { motion, AnimatePresence } from "framer-motion";

function AddManualOrder() {
  const today = new Date().toISOString().split("T")[0];

  const [customerList, setCustomerList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [customer, setCustomer] = useState({
    customer_id: "", customer_name: "", company_name: "", phone_1: "",
    email: "", address_line1: "", address_line2: "", city: "", province: ""
  });

  const [order, setOrder] = useState({
    order_id: "", order_date: today, payment_method: "COD", note: "",
    item_total: 0, discount: 0, subtotal: 0, shipping_cost_fixed: 400,
    tax_percent: 0, order_total: 0
  });

  const [items, setItems] = useState([
    { sku: "", product_name: "", quantity: 1, unit_price: 0, item_total: 0 }
  ]);

  useEffect(() => { generateOrderId(); }, []);
  useEffect(() => { calculateTotals(); }, [items, order.discount, order.shipping_cost_fixed, order.tax_percent]);

  const generateOrderId = async () => {
    try {
      const res = await API.get("/orders/next-id");
      setOrder(prev => ({ ...prev, order_id: res.data.order_id }));
    } catch (err) { console.log(err); }
  };

  const calculateTotals = () => {
    const itemTotal = items.reduce((sum, i) => sum + Number(i.item_total || 0), 0);
    const subtotal = itemTotal - Number(order.discount || 0);
    const taxAmount = (subtotal * Number(order.tax_percent || 0)) / 100;
    const total = subtotal + Number(order.shipping_cost_fixed || 0) + taxAmount;

    setOrder(prev => ({ ...prev, item_total: itemTotal, subtotal: subtotal, order_total: total }));
  };

  const handleCustomer = (e) => setCustomer({ ...customer, [e.target.name]: e.target.value });

  const checkPhone = async (e) => {
    const phone = e.target.value;
    setCustomer(prev => ({ ...prev, phone_1: phone }));
    if (phone.length < 3) { setShowDropdown(false); return; }
    try {
      const res = await API.get(`/customers/search/${phone}`);
      const list = res.data.data || [];
      setCustomerList(list);
      setShowDropdown(list.length > 0);
    } catch (err) { setShowDropdown(false); }
  };

  const selectCustomer = (c) => {
    setCustomer({
      customer_id: c.id, customer_name: c.customer_name || "", company_name: c.company_name || "",
      phone_1: c.phone_1, email: c.email || "", address_line1: c.address_line1 || "",
      address_line2: c.address_line2 || "", city: c.city || "", province: c.province || "", postcode: c.postcode || ""
    });
    setShowDropdown(false);
  };

  const handleItemChange = (index, e) => {
    const updated = [...items];
    updated[index][e.target.name] = e.target.value;
    updated[index].item_total = (updated[index].quantity || 0) * (updated[index].unit_price || 0);
    setItems(updated);
  };

  const addItem = () => setItems([...items, { sku: "", product_name: "", quantity: 1, unit_price: 0, item_total: 0 }]);
  const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

  const submitOrder = async () => {
    try {
      let customer_id = customer.customer_id;
      if (!customer_id) {
        const res = await API.post("/customers/create", customer);
        customer_id = res.data.data.id;
      }
      await API.post("/orders/create", { order: { ...order, customer_code: customer_id }, items });
      alert("Order successfully created");
      window.location.reload();
    } catch (err) { alert("Error creating order"); }
  };

  const labelClass = "text-sm font-semibold text-gray-600 text-right pr-4 self-center";
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h1 className="text-lg font-bold text-gray-800">Create Manual Order</h1>
          <button className="text-gray-400 hover:text-black">✕</button>
        </div>

        <div className="p-8">
          {/* Main Form Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            
            {/* Left Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-3">
                <label className={labelClass}>Name <span className="text-red-500">*</span></label>
                <div className="col-span-2">
                  <input name="customer_name" value={customer.customer_name} onChange={handleCustomer} className={inputClass} placeholder="Customer Name" />
                </div>
              </div>

              <div className="grid grid-cols-3">
                <label className={labelClass}>Company</label>
                <div className="col-span-2">
                  <input name="company_name" value={customer.company_name} onChange={handleCustomer} className={inputClass} placeholder="Company Name" />
                </div>
              </div>

              <div className="grid grid-cols-3">
                <label className={labelClass}>Shipping Address <span className="text-red-500">*</span></label>
                <div className="col-span-2 space-y-2">
                  <input name="address_line1" value={customer.address_line1} onChange={handleCustomer} className={inputClass} placeholder="Line 1" />
                  <input name="address_line2" value={customer.address_line2} onChange={handleCustomer} className={inputClass} placeholder="Line 2" />
                  <input name="city" value={customer.city} onChange={handleCustomer} className={inputClass} placeholder="City" />
                  <input name="province" value={customer.province} onChange={handleCustomer} className={inputClass} placeholder="Region/State" />
                </div>
              </div>

              <div className="grid grid-cols-3 relative">
                <label className={labelClass}>Phone Number</label>
                <div className="col-span-2">
                  <input value={customer.phone_1} onChange={checkPhone} className={inputClass} placeholder="Phone Number" />
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto text-sm">
                        {customerList.map((c, i) => (
                          <div key={i} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0">
                            {c.customer_name} ({c.phone_1})
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-3">
                <label className={labelClass}>Order ID <span className="text-red-500">*</span></label>
                <div className="col-span-2">
                  <input value={order.order_id} readOnly className={`${inputClass} bg-gray-50`} />
                </div>
              </div>

              <div className="grid grid-cols-3">
                <label className={labelClass}>Order date <span className="text-red-500">*</span></label>
                <div className="col-span-2">
                  <input type="date" value={order.order_date} onChange={(e)=>setOrder({...order, order_date: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 pt-2">
                <label className={labelClass}></label>
                <div className="col-span-2 flex items-center gap-2">
                   <input type="checkbox" className="w-4 h-4" defaultChecked />
                   <span className="text-sm text-gray-700">Billing Address</span>
                </div>
              </div>

              <div className="grid grid-cols-3 pt-12">
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <div className="col-span-2">
                  <input name="email" value={customer.email} onChange={handleCustomer} className={inputClass} placeholder="Email Address" />
                </div>
              </div>

              <div className="grid grid-cols-3">
                <label className={labelClass}>Payment Method</label>
                <div className="col-span-2">
                  <input value={order.payment_method} onChange={(e)=>setOrder({...order, payment_method: e.target.value})} className={inputClass} placeholder="Payment Method" />
                </div>
              </div>
            </div>
          </div>

          {/* Note Area */}
          <div className="mt-6 grid grid-cols-6">
             <label className="text-sm font-semibold text-gray-600 text-right pr-4 pt-2">Note <span className="text-red-500">*</span></label>
             <textarea className="col-span-5 w-full border border-gray-300 rounded p-3 text-sm min-h-[80px]" placeholder="Please enter note..." value={order.note} onChange={(e)=>setOrder({...order, note: e.target.value})}></textarea>
          </div>

          {/* Items Section */}
          <div className="mt-10">
            <h3 className="text-blue-500 text-sm font-semibold mb-3">Order line item's</h3>
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase">
                <div className="col-span-3 ml-12">SKU *</div>
                <div className="col-span-5">Description *</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2">Unit Price</div>
              </div>
              
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3 flex">
                    <button className="bg-gray-200 px-3 py-2 text-xs border border-gray-300 rounded-l hover:bg-gray-300 transition-colors">Pick</button>
                    <input name="sku" value={item.sku} onChange={(e)=>handleItemChange(i,e)} className="w-full border border-gray-300 rounded-r px-3 py-2 text-sm outline-none" />
                  </div>
                  <input name="product_name" value={item.product_name} onChange={(e)=>handleItemChange(i,e)} className="col-span-5 border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                  <input type="number" name="quantity" value={item.quantity} onChange={(e)=>handleItemChange(i,e)} className="col-span-2 border border-gray-300 rounded px-3 py-2 text-sm text-center outline-none" />
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="number" name="unit_price" value={item.unit_price} onChange={(e)=>handleItemChange(i,e)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none" />
                    <button onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="bg-gray-600 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-gray-700 transition-colors">Add another line item</button>
            </div>
          </div>

          {/* Bottom Summary Section */}
          <div className="mt-8 flex justify-end border-t pt-6">
            <div className="w-80 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-600">Lineitem Total <span className="text-red-500">*</span></span>
                <input readOnly value={order.item_total.toFixed(2)} className="w-32 bg-gray-100 border rounded px-2 py-1 text-right outline-none" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-red-500">Discount (-)</span>
                <input value={order.discount} onChange={(e)=>setOrder({...order, discount: e.target.value})} className="w-32 border border-gray-300 rounded px-2 py-1 text-right outline-none" />
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-600">Subtotal <span className="text-red-500">*</span></span>
                <input readOnly value={order.subtotal.toFixed(2)} className="w-32 bg-gray-100 border rounded px-2 py-1 text-right outline-none" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-600">Shipping Paid</span>
                <input value={order.shipping_cost_fixed} onChange={(e)=>setOrder({...order, shipping_cost_fixed: e.target.value})} className="w-32 border border-gray-300 rounded px-2 py-1 text-right outline-none" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-600">Tax Percentage (%)</span>
                <input value={order.tax_percent} onChange={(e)=>setOrder({...order, tax_percent: e.target.value})} className="w-32 border border-gray-300 rounded px-2 py-1 text-right outline-none" />
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-600">Order Total <span className="text-red-500">*</span></span>
                <input readOnly value={order.order_total.toFixed(2)} className="w-32 bg-gray-100 border rounded px-2 py-1 text-right outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button onClick={submitOrder} className="bg-blue-600 text-white px-6 py-2 rounded font-bold text-sm hover:bg-blue-700 shadow-sm transition-all">
            Create Order
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default AddManualOrder;