import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { clearSession, getToken, saveSession } from '../../auth/authStorage';

export default function ProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, allowed: false });

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      const token = getToken();

      if (!token) {
        if (mounted) setState({ loading: false, allowed: false });
        return;
      }

      try {
        const result = await authApi.me();
        if (mounted) {
          saveSession({ token, user: result.user });
          setState({ loading: false, allowed: true });
        }
      } catch (_error) {
        clearSession();
        if (mounted) setState({ loading: false, allowed: false });
      }
    }

    verifySession();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-soft">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#093C5D]" />
          <p className="text-sm font-medium text-slate-700">Checking login...</p>
        </div>
      </div>
    );
  }

  if (!state.allowed) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}
