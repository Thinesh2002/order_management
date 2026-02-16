import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PlusSquare,
  List,
  ClipboardList,
  Zap,
  PenTool,
  Wallet,
  ShoppingBag,
  FileText,
  Users,
  X
} from "lucide-react";

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-72 h-full bg-[#020617] border-r border-[#1E293B] flex flex-col">

      {/* MOBILE CLOSE */}
      <div className="lg:hidden flex justify-end p-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-[#0F172A] text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* LOGO / TITLE */}
      <div className="px-3 py-3 ">

      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        <MenuItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />

        <MenuTitle title="Orders" />
        <MenuItem to="/daraz-orders" icon={Zap} label="Daraz Orders" onClick={onClose} />

      </nav>

      {/* FOOTER USER */}
      <div className="p-4 border-t border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-500 text-black flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <p className="text-sm text-white font-semibold">
              System Admin
            </p>
            <p className="text-[11px] text-slate-500">
              Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ================= SUB COMPONENTS ================= */

function MenuTitle({ title }) {
  return (
    <p className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-slate-500">
      {title}
    </p>
  );
}

function MenuItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `
        flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all
        ${
          isActive
            ? "bg-[#111827] text-sky-400 border-l-4 border-sky-400"
            : "text-slate-400 hover:bg-[#0F172A] hover:text-white"
        }
        `
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}
