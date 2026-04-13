import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../config/api";
import { getStoredUser } from "../../config/auth";
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Clock, 
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Loader2
} from "lucide-react";

export default function UserDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, recent: [] });
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/user/stats");
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get("/user/users");
      setUsers(res.data.users || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const filtered = users.filter(u =>
    (u.name || "").toLowerCase().includes(query.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(query.toLowerCase()) ||
    (u.user_id || "").toLowerCase().includes(query.toLowerCase()) ||
    String(u.id) === query
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await API.delete(`/auth/${id}`);
      fetchStats();
      fetchUsers();
    } catch (err) { alert(err.response?.data?.message || "Deletion failed"); }
  };

  const handleEdit = async (u) => {
    const me = getStoredUser();
    if (me && me.id === u.id) { navigate("/profile"); return; }
    const newName = prompt("Update User Name:", u.name || "");
    if (!newName) return;
    try {
      await API.put(`/auth/${u.id}`, { name: newName });
      fetchUsers(); fetchStats();
    } catch (err) { alert("Update failed"); }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-8 animate-in fade-in duration-500 font-sans text-slate-600">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">User Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Manage system access and user profiles</p>
        </div>

        <button
          onClick={() => navigate("/register")}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium rounded-xl transition-all active:scale-[0.98] shadow-sm"
        >
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 text-[12px] font-medium uppercase tracking-wider mb-3">
            <Users size={16} /> Total Users
          </div>
          <div className="text-3xl font-semibold text-slate-900">{stats.total ?? 0}</div>
        </div>

        <div className="md:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 text-[12px] font-medium uppercase tracking-wider mb-4">
            <Clock size={16} /> Recently Added
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {stats.recent?.length ? stats.recent.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl min-w-[180px] border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[12px] font-semibold text-slate-700">
                  {u.name?.[0] || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{u.name || "User"}</p>
                  <p className="text-[10px] text-slate-400">ID: {u.user_id}</p>
                </div>
              </div>
            )) : <p className="text-slate-400 text-[13px] italic">No recent activity</p>}
          </div>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* FILTERS */}
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-[14px] outline-none focus:border-slate-400 transition-all placeholder:text-slate-300"
              placeholder="Search by name, email or ID..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          {query && (
            <button
              onClick={() => { setQuery(""); setPage(1); }}
              className="px-4 py-2.5 text-slate-400 hover:text-slate-600 text-[13px] font-medium flex items-center gap-2 transition-colors"
            >
              <X size={16} /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-3" size={24} />
            <p className="text-[13px]">Loading user data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-4 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Identity</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User Handle</th>
                  <th className="py-4 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date Joined</th>
                  <th className="py-4 px-6 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-medium text-[13px]">
                          {u.name?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-medium text-slate-900">{u.name}</span>
                          <span className="text-[12px] text-slate-400 flex items-center gap-1"><Mail size={12}/> {u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[12px] font-medium text-slate-600">
                        {u.user_id}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[13px] text-slate-400">{u.created_at}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(u)} 
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit User"
                        >
                          <Edit3 size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <p className="text-[12px] text-slate-400">
                Showing {paginated.length} of {filtered.length} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-[13px] font-medium px-4">
                  Page {page} of {totalPages}
                </div>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}