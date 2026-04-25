import React from "react";
import { SKU_IMAGE_API_BASE_URL } from "../../../../config/api"; // Path check pannikonga

const InvoiceTemplate = React.forwardRef(({ order, items }, ref) => {
  if (!order) return null;

  const brandLogo = "https://backend.teckvora.com/images/block/1775881671306-LogoPNG.png";
  
  // Logic calculations
  const shipping = Number(order.shipping_cost_fixed || 0);
  const discount = Number(order.discount_amount || 0);
  const total = Number(order.order_total || 0);
  const subtotal = total - shipping + discount;

  // Payment Status Logic
  const paymentStatus = order.paid_amount >= order.order_total ? "Completed" : "Pending";

  return (
    <div ref={ref} className="p-12 bg-white text-slate-800 font-sans" style={{ minHeight: "297mm", width: "100%" }}>
      
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
        <div className="space-y-4">
          <img src={brandLogo} alt="BrightHub" className="w-[260px] h-auto object-contain" />
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
            <p>BrightHub</p>
            <p>www.brighthub.lk</p>
            <p>0769663834</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-1">INVOICE</h1>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">#{order.order_id}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Date: {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* BILLING & STATUS */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Bill From:</p>
          <h3 className="font-black text-lg text-slate-900 mb-1">BrightHub</h3>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
           Navaly South,<br />
           Manipay,<br />
            Jaffna
          </p>
     
        </div>
        <div className="flex flex-col justify-center pr-4">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Bill To:</p>
          <h3 className="font-black text-lg text-slate-900 mb-1">{order.customer_name}</h3>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {order.address_line1},<br />
            {order.city}
          </p>
          <div className="mt-4 flex flex-col gap-1 text-xs font-bold">
            <p><span className="text-slate-400">Phone:</span> {order.phone_1}</p>
          </div>
        </div>
        </div>
      </div>

      {/* ITEMS TABLE WITH IMAGES */}
      <table className="w-full mb-10 border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
            <th className="py-4 px-6 text-left rounded-l-lg">Product</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Price</th>
            <th className="py-4 px-6 text-right rounded-r-lg">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const imageUrl = item.preview_image 
              ? `${SKU_IMAGE_API_BASE_URL}/images/productimage/${item.sku}/${item.preview_image}`
              : null;

            return (
              <tr key={index}>
                <td className="py-6 px-6">
                  <div className="flex items-center gap-4">
                    {/* Image handling in Invoice */}
                    <div className="w-12 h-12 bg-gray-50 rounded border border-gray-100 overflow-hidden flex-shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100" />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{item.product_name}</p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">SKU: {item.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="py-6 text-center font-bold text-sm text-slate-600">{item.quantity}</td>
                <td className="py-6 text-right text-sm font-medium text-slate-600">Rs {Number(item.unit_price).toFixed(2)}</td>
                <td className="py-6 px-6 text-right font-black text-slate-900 text-sm font-mono">Rs {Number(item.item_total).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* SUMMARY */}
      <div className="flex justify-end pt-6 border-t-2 border-slate-100">
        <div className="w-full max-w-[280px] space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Subtotal</span>
            <span className="text-slate-900 font-mono">Rs {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Shipping</span>
            <span className="text-slate-900 font-mono">Rs {shipping.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs font-bold text-red-500 uppercase">
              <span>Discount</span>
              <span className="font-mono">- Rs {discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center bg-blue-600 p-4 rounded-xl mt-4 text-white">
            <span className="text-xs font-black uppercase">Grand Total</span>
            <span className="text-lg font-black font-mono tracking-tight">Rs {total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10 text-center">
        <div className=" py-5  ">
          <p className="text-xl font-[500] text-slate-900 uppercase tracking-tight ">Thanks for choosing BrightHub!</p>
          <p className="text-[10px] text-slate-400 font-[400] mt-2 tracking-widest uppercase">Computer Generated Invoice | No Signature Required</p>
        </div>
      </div>
    </div>
  );
});

export default InvoiceTemplate;