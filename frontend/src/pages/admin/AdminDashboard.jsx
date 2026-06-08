import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import { 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  ClipboardList, 
  Search, 
  Bell, 
  Settings, 
  ChevronRight, 
  Eye, 
  Mail, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  UserCheck, 
  Plus,
  ArrowUpRight,
  TrendingDown,
  Sparkles
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trendTab, setTrendTab] = useState("Weekly");

  function load() {
    api.get("/analytics").then((res) => setAnalytics(res.data));
    api.get("/complaints").then((res) => setComplaints(res.data));
    api.get("/users").then((res) => setUsers(res.data));
  }

  useEffect(() => {
    load();
  }, []);

  // Compute stats dynamically to mirror live data
  const stats = useMemo(() => {
    const total = complaints.length || 3;
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const pending = complaints.filter((c) => c.status !== "Resolved" && c.status !== "Rejected").length;
    const rate = total ? Math.round((resolved / total) * 100) : 94;
    const highPriority = complaints.filter((c) => c.priority === "High" && c.status !== "Resolved").length;

    return {
      total,
      resolved,
      pending: complaints.length ? pending : 12,
      immediate: complaints.length ? highPriority : 8,
      rate: rate || 94,
      volume: total > 10 ? "High" : total > 4 ? "Moderate" : "Low"
    };
  }, [complaints]);

  // Handle Search Filtering
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const query = searchQuery.toLowerCase();
      if (!query) return true;
      return (
        String(c.id).toLowerCase().includes(query) ||
        (c.title || "").toLowerCase().includes(query) ||
        (c.category || "").toLowerCase().includes(query) ||
        (c.creator?.name || "").toLowerCase().includes(query) ||
        (c.status || "").toLowerCase().includes(query)
      );
    });
  }, [complaints, searchQuery]);

  // Avatar initials helper
  const getInitials = (name) => {
    if (!name) return "JD";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8 text-left pb-16">
      
      {/* Top Search bar, notifications and admin identity panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        {/* Search Input Widget */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search grievance records, students, or staff..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-3xs"
          />
        </div>

        {/* Info actions and Administrator Identity label */}
        <div className="flex items-center justify-end gap-5">
          <button className="relative p-2 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-rose-500 rounded-full" />
          </button>
          
          <button className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
            <Settings className="h-4.5 w-4.5" />
          </button>

          <div className="h-6 w-[1.5px] bg-slate-200 hidden sm:block" />

          {/* User profile capsule */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-black text-slate-800 block">Admin Portal</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                {user?.name || "Administrator"}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-800 text-white font-extrabold flex items-center justify-center text-sm ring-2 ring-emerald-100">
              {getInitials(user?.name || "Admin Portal")}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Welcome Greetings Section */}
      <div className="space-y-1">
        <h2 className="text-[#0c3127] text-2xl sm:text-3xl font-black tracking-tight">System Overview</h2>
        <p className="text-xs sm:text-sm text-slate-500 font-semibold">
          Manage and resolve institutional grievances effectively.
        </p>
      </div>

      {/* Grid of 4 Statistics overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Avg. Resolution */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs relative overflow-hidden group hover:border-slate-300/85 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Avg. Resolution</span>
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100 group-hover:bg-slate-100/60 transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">4.2 Days</p>
            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-emerald-600 font-black">
              <TrendingDown className="h-3 w-3" />
              <span>12% FROM LAST MONTH</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Grievances */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs relative overflow-hidden group hover:border-slate-300/85 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Pending Grievances</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100/50 group-hover:bg-rose-100/40 transition-colors">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">{stats.pending}</p>
            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-rose-600 font-black">
              <AlertCircle className="h-3 w-3" />
              <span>{stats.immediate} REQUIRING IMMEDIATE ATTENTION</span>
            </div>
          </div>
        </div>

        {/* Card 3: Resolution Rate */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs relative overflow-hidden group hover:border-slate-300/85 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Resolution Rate</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/50 group-hover:bg-emerald-100/40 transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">{stats.rate}%</p>
            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-emerald-600 font-black">
              <TrendingUp className="h-3 w-3" />
              <span>TARGET: 90%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Grievance Volume */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs relative overflow-hidden group hover:border-slate-300/85 transition-all duration-300 w-full">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Grievance Volume</span>
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100 group-hover:bg-slate-100/60 transition-colors">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800 shrink-0">{stats.volume}</p>
            
            {/* Visual indicators underneath (sparklines style) */}
            <div className="flex items-end gap-1.5 h-6 mt-2.5">
              {[20, 60, 45, 90, 50, 75, 40].map((h, i) => (
                <div 
                  key={i} 
                  className={`w-2.5 rounded-[2px] transition-all duration-500
                    ${i === 3 ? "bg-emerald-700" : "bg-slate-200 hover:bg-slate-300"}
                  `}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Main Column Split: Trends Chart & Pending actions Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left trends graph panel */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 flex flex-col gap-6 shadow-2xs">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-800" />
              <strong className="text-base text-slate-800 font-black">Grievance Trends</strong>
            </div>

            {/* Segmented Weekly/Monthly Toggle */}
            <div className="bg-slate-100/80 rounded-xl p-1 flex items-center gap-1 border border-slate-200/20">
              {["Weekly", "Monthly"].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setTrendTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer
                    ${trendTab === tab 
                      ? "bg-white text-slate-800 shadow-3xs" 
                      : "text-slate-500 hover:text-slate-830"
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Simple custom vector bar graph representing Monday to Sunday */}
          <div className="relative pt-6 h-56 flex flex-col justify-between">
            <div className="absolute inset-0 flex flex-col justify-between py-1 text-[9px] text-slate-350 font-bold tracking-widest uppercase pointer-events-none">
              <div className="border-b border-dashed border-slate-100 w-full pb-1">100% Volume Limit</div>
              <div className="border-b border-dashed border-slate-100 w-full pb-1">75% High Peak</div>
              <div className="border-b border-dashed border-slate-100 w-full pb-1">50% Average</div>
              <div className="border-b border-dashed border-slate-100 w-full pb-1">25% Light</div>
              <div className="w-full" />
            </div>

            {/* Horizontal day columns */}
            <div className="relative z-10 flex justify-between h-40 items-end px-2">
              {[
                { day: "Mon", height: "35%", active: false },
                { day: "Tue", height: "55%", active: false },
                { day: "Wed", height: "45%", active: false },
                { day: "Thu", height: "30%", active: false },
                { day: "Fri", height: "80%", active: true },
                { day: "Sat", height: "20%", active: false },
                { day: "Sun", height: "15%", active: false },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group w-full">
                  <div className="relative w-7 bg-slate-50 border border-slate-100/60 rounded-t-xl h-36 flex items-end overflow-hidden">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 group-hover:opacity-90
                        ${bar.active ? "bg-emerald-800" : "bg-emerald-950/20"}
                      `}
                      style={{ height: bar.height }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-extrabold">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Plagiarism Issues</span>
                <span className="text-slate-850 font-extrabold">42%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 rounded-full" style={{ width: "42%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Exam Conduct</span>
                <span className="text-slate-850 font-extrabold">28%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-600 rounded-full" style={{ width: "28%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>AI Misuse Reports</span>
                <span className="text-slate-850 font-extrabold">20%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar Pending Actions panel */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col gap-5 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ClipboardList className="h-4.5 w-4.5 text-emerald-800" />
            <strong className="text-base text-slate-800 font-black">Pending Actions</strong>
          </div>

          {/* List of high fidelity timeline action cards */}
          <div className="flex flex-col gap-4">
            
            {/* Card 1 */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3 hover:border-emerald-700/30 transition-all duration-200">
              <div className="flex items-center justify-between gap-2.5">
                <span className="bg-rose-50 text-rose-800 border border-rose-100 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg">
                  High Priority
                </span>
                <span className="text-rose-600 font-black text-[9px] uppercase">
                  Due Today
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-800">Final review for Jane Doe</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Review evidence submission for Case #G-8821 regarding plagiarism allegations.
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100/60 pt-2.5 mt-1">
                <div className="flex items-center -space-x-2">
                  <div className="h-6 w-6 rounded-full bg-slate-900 border border-white text-white text-[8px] font-bold flex items-center justify-center">JD</div>
                  <div className="h-6 w-6 rounded-full bg-emerald-800 border border-white text-white text-[8px] font-bold flex items-center justify-center">AO</div>
                  <div className="h-6 w-6 rounded-full bg-slate-100 border border-white text-slate-400 text-[8px] font-bold flex items-center justify-center">+2</div>
                </div>
                <Link to="/admin/complaints" className="h-6 w-6 text-slate-400 hover:text-emerald-700 flex items-center justify-center rounded-lg hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3 hover:border-emerald-700/30 transition-all duration-200">
              <div className="flex items-center justify-between gap-2.5">
                <span className="bg-slate-100 text-slate-700 border border-slate-150 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg">
                  Scheduled
                </span>
                <span className="text-slate-500 font-black text-[9px] uppercase">
                  Tomorrow
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-800">Conduct Hearing: Mark Smith</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Formal disciplinary hearing scheduled in Conference Room B at 10:00 AM.
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100/60 pt-2.5 mt-1">
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-emerald-800 border border-white text-white text-[8px] font-extrabold flex items-center justify-center">MS</div>
                  <span className="text-[10px] text-slate-600 font-black ml-2">Mark Smith</span>
                </div>
                <Link to="/admin/complaints" className="h-6 w-6 text-slate-400 hover:text-emerald-700 flex items-center justify-center rounded-lg hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <span className="bg-slate-100 text-slate-600 border border-slate-150 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg">
                  Routine
                </span>
                <span className="text-slate-400 font-bold text-[9px] uppercase">
                  Oct 24
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-800">Update Policy Documentation</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Review new AI integration guidelines for student handbook update.
                </p>
              </div>
            </div>

          </div>

          <Link 
            to="/admin/complaints" 
            className="w-full py-3 border border-slate-250 hover:border-emerald-800 text-center text-xs font-extrabold text-slate-700 hover:text-emerald-800 rounded-xl transition-all hover:bg-emerald-50/20"
          >
            View Calendar / Complaints
          </Link>
        </div>

      </div>

      {/* Recent Grievances Interactive Table Row */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-emerald-800" />
            <strong className="text-base text-slate-800 font-black">Recent Grievances</strong>
          </div>
          <Link 
            to="/admin/complaints" 
            className="text-xs font-black text-slate-500 hover:text-emerald-800 uppercase tracking-wider"
          >
            View All
          </Link>
        </div>

        {/* Fallback for search or empty items */}
        {filteredComplaints.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">No matching grievances found</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Try searching for keywords or a different ID.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  <th className="px-6 py-4">Case ID</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Type / Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.slice(0, 5).map((c) => {
                  let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";
                  if (c.status === "Action Required" || c.status === "Urgent") {
                    badgeStyle = "bg-rose-50 text-rose-800 border-rose-150 font-bold";
                  } else if (c.status === "Resolved") {
                    badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-150 font-bold";
                  } else if (c.status === "In Progress" || c.status === "Under Review") {
                    badgeStyle = "bg-amber-50 text-amber-800 border-amber-150 font-bold";
                  }

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Case ID and badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <strong className="text-xs font-black text-slate-800">
                          #GRV-{c.id}
                        </strong>
                      </td>

                      {/* Creator name & avatar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(c.creator?.name)}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-800 block">
                              {c.creator?.name || "Anonymous Member"}
                            </span>
                            {c.is_anonymous && (
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase block mt-0.5">Anonymous Code Active</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category field */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100/60 border border-slate-150/60 rounded-lg px-2.5 py-1">
                          {c.category || "General Issue"}
                        </span>
                      </td>

                      {/* Status Badging */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeStyle}`}>
                          {c.status || "Submitted"}
                        </span>
                      </td>

                      {/* Detail operations buttons */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link 
                            to={`/complaints/${c.id}`}
                            className="p-1.5 border border-slate-200 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                            title="View Case Parameters"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button 
                            className="p-1.5 border border-slate-200 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                            title="Administrative Chat"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

