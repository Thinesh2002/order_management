import { useState, useRef, useEffect } from "react";
import {
  Menu as MenuIcon,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../config/auth";

export default function Header({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = getStoredUser();

  const userName = user?.name || "Admin User";
  const userEmail = user?.email || "admin@example.com";
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#b6b6b6] bg-[#343538]  backdrop-blur-xl">
      <div className="flex h-18 items-center justify-between px-2 sm:px-2 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="inline-flex h-11 w-11 items-center justify-center - text-[#e0e0e0] transition-all duration-200 hover:border-[#b6b6b6] hover:bg-slate-800 hover:text-white"
          >
            <MenuIcon size={28} />
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="flex flex-col items-start rounded-2xl px-1 text-left transition-opacity hover:opacity-90"
          >
           
            <h1 className="text-base font-semibold tracking-tight text-[#d6d6d6] text-[23px]">
              Order Management
            </h1>
       
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">


          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="flex items-center gap-3 rounded-[5px]  px-3 py-2 transition-all duration-200 hover:border-slate-700 hover:bg-[#6b6b6b] cursor-pointer"
            >
           

              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-medium text-slate-100">
                  {userName}
                </p>
           
              </div>

              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
                <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-4">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {userName}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {userEmail}
                  </p>
                </div>

                <div className="p-2">
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-900 hover:text-white">
                    <Settings size={16} className="text-slate-400" />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
