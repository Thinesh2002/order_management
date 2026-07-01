import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, LogIn, UserRound } from 'lucide-react';
import { authApi } from '../api/authApi';
import { getToken, saveSession } from '../auth/authStorage';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(Boolean(getToken()));

  const redirectTo = useMemo(() => {
    const value = searchParams.get('redirect') || '/order-management';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/order-management';
  }, [searchParams]);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  if (hasToken) {
    return <Navigate to={redirectTo} replace />;
  }

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.identifier.trim() || !form.password) {
      setError('User ID/email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.login({
        identifier: form.identifier.trim(),
        password: form.password,
      });

      saveSession({ token: result.token, user: result.user });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Login failed. Please check your details.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#093C5D] via-[#0f4f76] to-slate-900 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#093C5D] text-white shadow-lg">
            <Lock size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management Login</h1>
          <p className="mt-2 text-sm text-slate-500">Please login before opening order pages.</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="label">User ID or Email</span>
            <div className="relative">
              <UserRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                value={form.identifier}
                onChange={(event) => update('identifier', event.target.value)}
                placeholder="Example: Thinesh or admin@email.com"
                autoComplete="username"
                autoFocus
              />
            </div>
          </label>

          <label className="block">
            <span className="label">Password</span>
            <div className="relative">
              <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                type="password"
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
          </label>

          <button
            type="submit"
            className="btn-primary h-11 w-full rounded-xl"
            disabled={loading}
          >
            <LogIn size={17} />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
