import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";
import TransExTrack from "../../pages/trans_ex_order_track";

const Manual_Order_Route = (
  <>
    <Route
      path="/trans-ex/track-orders"
      element={
        <ProtectedRoute>
          <Layout>
            <TransExTrack />
          </Layout>
        </ProtectedRoute>
      }
    />

    
  </>
);

export default Manual_Order_Route;