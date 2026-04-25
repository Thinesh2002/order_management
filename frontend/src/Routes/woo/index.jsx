import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import WooOrders from "../../pages/orders/woo/orders/index";
import WooDetailOrderView  from "../../pages/orders/woo/woo_detail_order_view/index";

const Manual_Order_Route = (
  <>
    <Route
      path="/woo-orders"
      element={
        <ProtectedRoute>
          <Layout>
            <WooOrders />
          </Layout>
        </ProtectedRoute>
      }
    />

        <Route
      path="/woo-orders/view/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <WooDetailOrderView  />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
);

export default Manual_Order_Route;