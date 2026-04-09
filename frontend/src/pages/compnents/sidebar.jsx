import { NavLink } from "react-router-dom";
import {
  Palette,
  Package,
  PlusSquare,
  Tags,
  ShoppingBag,
  GitBranch,
  ClipboardList,
  BarChart3,
  Warehouse,
  FileText,
  X
} from "lucide-react";

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-72 h-full bg-[#ececec] border-r border-[#3a3a3a3d] flex flex-col">

      {/* MOBILE CLOSE */}
      <div className="lg:hidden flex justify-end p-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-[#0F172A] text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>



      <nav className="flex-1 overflow-y-auto  space-y-1">


        <MenuTitle title="Orders" />
         <MenuItem to="/manual-orders" icon={Package} label="Manual Orders" onClick={onClose} />
        <MenuItem to="/daraz-orders" icon={Package} label="Daraz Orders" onClick={onClose} />


        <MenuTitle title="Trend Analysis" />
        <MenuItem to="/product-moving-trend" icon={BarChart3} label="Daraz Product Trend" onClick={onClose} />


      </nav>

    </aside>
  );
}

/* ================= SUB COMPONENTS ================= */

function MenuTitle({ title }) {
  return (
    <p className="px-3 pt-4 pb-0 text-[11px] uppercase tracking-wider text-[#050505fd]  border-t border-[#2020201f] pb-1">
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
        flex items-center gap-2 px-2 py-1.5 pl-6  text-[12px] transition-all 
        ${isActive
          ? "bg-[#d8d8d894] text-[#2b2b2b] border-l-3 border-[#222222]"
          : "text-slate-400 hover:bg-[#d1d1d18a] hover:text-[#2b2b2b]"
        }
        `
      }
    >
      <Icon size={14} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}