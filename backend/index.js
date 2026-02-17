require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/user_route");
const darazRoutes = require("./routes/daraz/daraz_order_route");
const productTrendRoutes = require("./routes/daraz/productTrendRoutes");

require("./cron/oder_sync");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/user", authRoutes);
app.use("/api/daraz", darazRoutes);
app.use("/api/daraz/analytics", productTrendRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
