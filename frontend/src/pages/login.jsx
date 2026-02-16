import React, { useState } from "react";
import API from "../config/api";
import { storeAuth } from "../config/auth";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShoppingCart, AlertCircle, ShieldCheck } from "lucide-react";

export default function Login({ onAuth }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await API.post("/user/login", { login, password });
      const { token, user } = res.data;

      storeAuth(user, token);
      if (onAuth) onAuth(user);

      navigate("/daraz-orders"); 
    } catch (err) {
      setMsg(err.response?.data?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative overflow-hidden font-sans">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-100 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden grid grid-cols-1 md:grid-cols-2 animate-in fade-in zoom-in duration-700">

        {/* LEFT PANEL: Branding & Visual */}
        <div className="hidden md:flex flex-col justify-between bg-blue-600 text-white p-12 relative overflow-hidden">
          <div className="z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/30">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-4 leading-tight">
              Order <br /> Management <br /> <span className="text-blue-200 italic">Console</span>
            </h1>
            <p className="text-blue-50 text-sm leading-relaxed max-w-xs opacity-90 font-medium">
              Efficiently handle your Daraz orders, inventory, and analytics in one place.
            </p>
          </div>

          <div className="z-10 bg-blue-700/50 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="text-blue-200" size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Secure Access</span>
            </div>
            <p className="text-[11px] text-blue-100 opacity-80">Authorized personnel only. All activities are logged for security purposes.</p>
          </div>

          {/* Abstract decoration */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-800 rounded-full blur-3xl opacity-30" />
        </div>

        {/* RIGHT PANEL: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              Admin <span className="text-blue-600 italic">Login</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Access your management dashboard</p>
          </div>

          {msg && (
            <div className="mb-6 flex items-center gap-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl animate-in slide-in-from-top-2">
              <AlertCircle size={16} />
              {msg}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Email or Username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 px-12 py-4 rounded-2xl text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 px-12 py-4 rounded-2xl text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 bg-slate-100 accent-blue-600" />
                <span className="group-hover:text-slate-700 transition-colors">Keep me signed in</span>
              </label>
              <Link to="/forgot-password" size={14} className="text-blue-600 hover:text-blue-700 hover:underline transition-all tracking-tight">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? "Authenticating..." : (
                <>
                  Enter Dashboard
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                &copy; 2026 Order Management System. v2.4.0
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}