import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut, Search, Settings } from 'lucide-react';
import SettingsMenu from './SettingsMenu.jsx';
import { authApi } from '../../api/authApi.js';
import { clearSession, getStoredUser } from '../../auth/authStorage.js';

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [searchText, setSearchText] = useState('');
  const [user] = useState(() => getStoredUser());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchText(params.get('search') || '');
  }, [location.search]);

  const time = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [now]
  );

  const date = useMemo(
    () =>
      now.toLocaleDateString([], {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    [now]
  );


  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_error) {
      // Even if server logging fails, clear browser session.
    }

    clearSession();
    navigate('/login', { replace: true });
  };

  const handleSearch = (event) => {
    event?.preventDefault();

    const value = searchText.trim();

    navigate(
      value
        ? `/order-management?search=${encodeURIComponent(value)}`
        : '/order-management'
    );

    window.dispatchEvent(
      new CustomEvent('global-order-search', {
        detail: { search: value },
      })
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-[#3B7597] bg-[#093C5D] shadow-sm">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          <button
            type="button"
            onClick={() => navigate('/order-management')}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-100 transition hover:bg-white/10 hover:text-white"
            title="Home"
          >
            <Home size={20} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/order-management')}
            className="hidden cursor-pointer text-left md:block"
          >
            <span className="block text-[17px] font-semibold text-white">
              Order Management
            </span>
          </button>

          <form
            onSubmit={handleSearch}
            className="mx-auto flex h-11 max-w-3xl flex-1 items-center rounded-full border border-[#4b5565] bg-[#eef1f5] px-3 transition focus-within:border-white focus-within:bg-white focus-within:shadow-sm"
          >
            <Search size={18} className="mr-2 text-slate-500" />

            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search order ID, customer, phone, SKU, product title..."
              className="h-full flex-1 border-none bg-transparent text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400"
            />

            <button
              type="submit"
              className="ml-2 rounded-full bg-[#1f2937] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#111827]"
            >
              Search
            </button>
          </form>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-4 text-white">
              {time}
            </p>
            <p className="mt-1 text-[11px] text-slate-300">{date}</p>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-right md:block">
            <p className="max-w-32 truncate text-xs font-semibold text-white">{user?.name || user?.user_uid || 'User'}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-300">{user?.role || 'Logged in'}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-100 transition hover:bg-red-500/20 hover:text-white"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={19} />
          </button>

          <div className="relative">
            <button
              type="button"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-100 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen((value) => !value)}
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={19} />
            </button>

            <SettingsMenu open={open} onClose={() => setOpen(false)} />
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-64px)] bg-white">
        <Outlet />
      </main>
    </div>
  );
}