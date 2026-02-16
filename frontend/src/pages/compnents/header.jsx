import { useState, useRef, useEffect } from "react";
import { Menu as MenuIcon, Settings, LogOut, ChevronDown, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../config/auth";

export default function Header({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-[#1E293B] flex items-center justify-between px-4 sm:px-8">
      
      {/* LEFT - Menu Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg bg-[#0F172A] text-slate-400 hover:text-white border border-[#1E293B] transition-all"
        >
          <MenuIcon size={20} />
        </button>

        <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
          <h1 className="text-white font-bold text-lg tracking-tight leading-none">Order Management</h1>
          <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider">Orders Overview</p>
        </div>
      </div>

      {/* RIGHT - Actions */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg bg-[#0F172A] text-slate-400 hover:text-white relative border border-[#1E293B]">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-sky-400 rounded-full"></span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0F172A] hover:bg-[#111827] transition border border-transparent hover:border-[#1E293B]"
          >
            <div className="w-8 h-8 rounded-full bg-sky-500 text-black flex items-center justify-center font-bold">
              {user?.name?.[0] || "A"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm text-white font-medium leading-none">{user?.name || "Admin User"}</p>
              <p className="text-[11px] text-slate-500 mt-1">Administrator</p>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-[#020617] border border-[#1E293B] rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#1E293B]">
                <p className="text-sm font-medium text-white truncate">{user?.name || "Admin User"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || "admin@example.com"}</p>
              </div>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-[#0F172A]">
                <Settings size={16} /> Settings
              </button>
              <button 
                onClick={() => { logout(); navigate("/login"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}