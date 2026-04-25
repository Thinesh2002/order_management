require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/user_route");
const darazRoutes = require("./routes/daraz/daraz_order_route");
const productTrendRoutes = require("./routes/daraz/productTrendRoutes");
const customerRoutes = require("./routes/customer/customer_route");
const orderRoutes = require("./routes/manual_orders/order_route");
const transorderRoutes = require("./routes/trans_ex_route/transex_route");
const woo_orders_route = require("./routes/woo_orders/woo_orders_route")
require("./cron/oder_sync");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/user", authRoutes);
app.use("/api/daraz", darazRoutes);
app.use("/api/daraz/analytics", productTrendRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/transorder", transorderRoutes);
app.use("/api/woo", woo_orders_route);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
