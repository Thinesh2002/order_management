import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./pages/compnents/Layout";
import Login from "./pages/login";
import Dashboard from "./pages/dasboard";
import User from "./pages/user/user_dashboard";

import ProtectedRoute from "./config/ProtectedRoute";
import DarazRoute from "./Routes/daraz_route/index";

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

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/daraz-orders" replace />} />
    </Routes>
  );
}
