import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import Daraz_orders from "../../pages/daraz/Orders/index";
import DarazOrdersDetailPage from "../../pages/daraz/Orders/detail_page/index";

const Daraz_Routes = (
  <>
    <Route
      path="/daraz-orders"
      element={
        <ProtectedRoute>
          <Layout>
            <Daraz_orders />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/daraz-orders/:orderId"
      element={
        <ProtectedRoute>
          <Layout>
            <DarazOrdersDetailPage />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
);

export default Daraz_Routes;