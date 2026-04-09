import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import Create_Orders from "../../pages/manual_orders/create_order/index";
import Order_Dashboard from "../../pages/manual_orders/index"

const Manual_Order_Route = (
  <>
    <Route
      path="/create-manual-orders"
      element={
        <ProtectedRoute>
          <Layout>
            <Create_Orders />
          </Layout>
        </ProtectedRoute>
      }
    />
        <Route
      path="/manual-orders"
      element={
        <ProtectedRoute>
          <Layout>
            <Order_Dashboard />
          </Layout>
        </ProtectedRoute>
      }
    />


  </>
);

export default Manual_Order_Route;