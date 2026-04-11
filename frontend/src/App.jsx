import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./pages/compnents/Layout";
import Login from "./pages/login";
import Dashboard from "./pages/dasboard";
import User from "./pages/user/user_dashboard";
import Manual_Order_Route from "./Routes/manual_orders";
import ProtectedRoute from "./config/ProtectedRoute";
import DarazRoute from "./Routes/daraz_route/index";
import Trans_route from "./Routes/trans_ex_order_route/index";
export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user-dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <User />
            </Layout>
          </ProtectedRoute>
        }
      />

  



  {DarazRoute}
  {Manual_Order_Route}
  {Trans_route}
      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
