import { NavLink } from 'react-router-dom';
import { ClipboardList, FileText, LogOut, Package, RotateCcw, Shield, Users } from 'lucide-react';

const links = [
  { to: '/order-management', label: 'Orders', icon: ClipboardList },
  { to: '/settings/sync', label: 'Sync Settings', icon: RotateCcw },
  { to: '/settings/logs', label: 'Logs', icon: FileText },
  { to: '/settings/account-status', label: 'Account Status', icon: Shield },
  { to: '/settings/packing-materials', label: 'Packing Materials', icon: Package },
  { to: '/settings/users', label: 'Users', icon: Users },
];

export default function SettingsMenu({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="menu">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `menu-item ${isActive ? 'bg-slate-100 text-brand' : ''}`}>
          <Icon size={15} /> {label}
        </NavLink>
      ))}
      <button type="button" className="menu-item" onClick={onClose}><LogOut size={15} /> Logout</button>
    </div>
  );
}
