import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import Create_Orders from "../../pages/manual_orders/create_order/index";
import Order_Dashboard from "../../pages/manual_orders/index"
import Manual_detail_order_view from "../../pages/manual_orders/detail_order_view/index"
import Edit_order from "../../pages/manual_orders/edit_order/index"

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

    <Route
      path="/manual-orders/view/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <Manual_detail_order_view />
          </Layout>
        </ProtectedRoute>
      }
    />

    <Route
      path="/manual-orders/edit/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <Edit_order />
          </Layout>
        </ProtectedRoute>
      }
    />


  </>
);

export default Manual_Order_Route;