import React, { useState } from "react";
import API from "../config/api";
import { storeAuth } from "../config/auth";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ChevronRight, LayoutDashboard, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";

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

      navigate("/dashboard"); 
    } catch (err) {
      setMsg(err.response?.data?.message || "Credentials match aagala. Check pannittu thirumba try pannunga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 font-sans antialiased text-slate-600">
      
      {/* SOFT BACKGROUND BLUR ELEMENTS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-[14px] text-slate-400 mt-1">
            Please enter your access details to continue
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white border border-slate-100 p-8 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          {msg && (
            <div className="mb-6 flex items-center gap-3 text-[13px] text-red-500 bg-red-50/50 border border-red-100/50 p-3.5 rounded-xl animate-in fade-in zoom-in duration-300">
              <AlertCircle size={18} strokeWidth={2} />
              <span className="font-medium">{msg}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {/* IDENTITY INPUT */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-500 ml-1">Identity</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors duration-300" size={18} strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Email or Username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200/60 px-11 py-3.5 rounded-xl text-[14px] text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all duration-300 placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-500 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors duration-300" size={18} strokeWidth={1.5} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200/60 px-11 py-3.5 rounded-xl text-[14px] text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all duration-300 placeholder:text-slate-300"
                />
              </div>
            </div>


            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl text-[14px] font-medium transition-all duration-300 disabled:opacity-70 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 shadow-sm relative overflow-hidden group"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <div className="mt-10 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
     
          <p className="text-[11px] text-slate-300 mt-4">
            OMS Management System &bull; <br/>
            Powerd by Teckvora Pvt Ltd &bull; &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}