import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import CreateManualOrderPage from './pages/CreateManualOrderPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import TrackingPage from './pages/TrackingPage.jsx';
import PackingMaterialsPage from './pages/PackingMaterialsPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import AccountStatusPage from './pages/AccountStatusPage.jsx';
import SyncSettingsPage from './pages/SyncSettingsPage.jsx';
import LogsPage from './pages/LogsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/order-management" replace />} />
        <Route path="/order-management" element={<OrdersPage />} />
        <Route path="/order-management/create" element={<CreateManualOrderPage />} />
        <Route path="/order-management/orders/:source/:id" element={<OrderDetailPage />} />
        <Route path="/order-management/tracking/:trackingId" element={<TrackingPage />} />
        <Route path="/settings/packing-materials" element={<PackingMaterialsPage />} />
        <Route path="/settings/account-status" element={<AccountStatusPage />} />
        <Route path="/settings/sync" element={<SyncSettingsPage />} />
        <Route path="/settings/users" element={<PlaceholderPage title="Users" message="Users stay inside existing Auth Management database." />} />
        <Route path="/settings/page-access" element={<PlaceholderPage title="Page Access" message="Page access stays inside existing Auth Management database." />} />
        <Route path="/settings/logs" element={<LogsPage />} />
      </Route>
    </Routes>
  );
}
