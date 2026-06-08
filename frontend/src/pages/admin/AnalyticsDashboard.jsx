import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Bell, 
  HelpCircle, 
  FileText, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Layers,
  Award,
  ChevronRight,
  Download,
  BookOpen,
  PieChart,
  ShieldCheck
} from "lucide-react";

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusNotification, setStatusNotification] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/analytics"),
      api.get("/complaints"),
    ])
      .then(([analyticsRes, complaintsRes]) => {
        setAnalytics(analyticsRes.data);
        setComplaints(complaintsRes.data || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const categoryBuckets = useMemo(() => {
    if (analytics?.complaints_by_category?.length) return analytics.complaints_by_category;
    const counts = complaints.reduce((acc, complaint) => {
      const key = complaint.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [analytics, complaints]);

  const statusBuckets = useMemo(() => {
    if (analytics?.complaints_by_status?.length) return analytics.complaints_by_status;
    const counts = complaints.reduce((acc, complaint) => {
      const key = complaint.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [analytics, complaints]);

  const stats = useMemo(() => {
    const total = analytics?.total_complaints ?? complaints.length;
    const rate = analytics?.resolution_rate ?? 0;
    const active = complaints.filter(c => c.status !== "Resolved" && c.status !== "Rejected").length;
    const resolvedDurations = complaints
      .filter((c) => c.status === "Resolved" && c.created_at && c.updated_at)
      .map((c) => new Date(c.updated_at).getTime() - new Date(c.created_at).getTime())
      .filter((ms) => Number.isFinite(ms) && ms >= 0);
    const avgResponse = resolvedDurations.length
      ? (resolvedDurations.reduce((sum, ms) => sum + ms, 0) / resolvedDurations.length / 86400000).toFixed(1)
      : "0";

    return {
      total,
      rate,
      avgResponse,
      active
    };
  }, [analytics, complaints]);

  // Extract avatar initials helper
  const getInitials = (name) => {
    if (!name) return "SJ";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Simulated export task
  const handleExportPDF = () => {
    setStatusNotification("Preparing executive audit document...");
    setTimeout(() => {
      window.print();
      setStatusNotification("");
    }, 1000);
  };

  const monthlyBuckets = useMemo(() => {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts = labels.map((label, month) => ({
      label,
      val: complaints.filter((complaint) => {
        const date = new Date(complaint.created_at);
        return Number.isFinite(date.getTime()) && date.getMonth() === month;
      }).length,
    }));
    const max = Math.max(...counts.map((item) => item.val), 1);
    return counts.map((item) => ({ ...item, height: `${(item.val / max) * 100}%`, active: item.val === max && max > 0 }));
  }, [complaints]);

  const filteredDepartments = useMemo(() => {
    const rows = categoryBuckets.map((bucket) => {
      const categoryComplaints = complaints.filter((c) => (c.category || "Uncategorized") === bucket.name);
      const resolvedCount = categoryComplaints.filter((c) => c.status === "Resolved").length;
      const efficiency = bucket.count ? Math.round((resolvedCount / bucket.count) * 100) : 0;
      return {
        name: bucket.name,
        cases: bucket.count,
        response: `${efficiency}% resolved`,
        status: bucket.count ? "Tracked" : "No cases",
        efficiency,
        color: efficiency >= 75 ? "bg-emerald-600" : efficiency >= 40 ? "bg-amber-500" : "bg-slate-400"
      };
    });
    if (!searchQuery) return rows;
    return rows.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categoryBuckets, complaints, searchQuery, stats.total]);

  const highPriorityCount = complaints.filter((c) => c.priority === "High" && c.status !== "Resolved" && c.status !== "Rejected").length;
  const standardCount = complaints.filter((c) => c.priority !== "High" && c.status !== "Resolved" && c.status !== "Rejected").length;

  return (
    <div className="space-y-8 text-left pb-16 relative">

      {/* Primary search headers and user parameters bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        
        {/* Search tool block */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search analytics parameters, logs, or departments..."
            className="w-full bg-slate-50 border border-slate-205 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 transition-all shadow-3xs"
          />
        </div>

        {/* Action badges and User status */}
        <div className="flex items-center justify-end gap-5">
          <button className="relative p-2 text-slate-400 hover:text-emerald-850 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-rose-500 rounded-full" />
          </button>
          
          <button className="p-2 text-slate-400 hover:text-emerald-850 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>

          <div className="h-6 w-[1.5px] bg-slate-200" />

          {/* Provost profile identity header info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-black text-slate-800 block">{user?.name || "Admin"}</span>
              <span className="text-[10px] text-slate-450 font-semibold block mt-0.5">
                Administrator
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-950 text-white font-extrabold flex items-center justify-center ring-2 ring-emerald-100 text-sm">
              {getInitials(user?.name || "Admin")}
            </div>
          </div>
        </div>
      </div>

      {/* Main Title Headers row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="space-y-1">
          <h2 className="text-[#0c3127] text-2xl sm:text-3xl font-black tracking-tight">Executive Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            Real-time oversight of institutional grievance patterns and resolution performance.
          </p>
        </div>

        {/* Controls widgets */}
        <div className="flex items-center gap-2.5">
          
          <button 
            onClick={() => alert("Setting scope parameters: last 12 calendar months data load.")}
            className="px-4 py-2 bg-white border border-slate-205 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl h-10 inline-flex items-center gap-2 cursor-pointer transition-all shadow-3xs"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Last 12 Months</span>
          </button>

          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-[#0c3127] hover:bg-[#0f4033] text-white text-xs font-black rounded-xl h-10 inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>

        </div>
      </div>

      {/* Status state ticker overlay */}
      {statusNotification && (
        <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl text-xs font-bold text-center text-emerald-800 animate-pulse">
          {statusNotification}
        </div>
      )}

      {/* Executive overview cards bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Grievances */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs group hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Grievances</span>
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100 group-hover:bg-slate-100 transition-colors">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">
              {stats.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-black">
              <ArrowUpRight className="h-3 w-3" />
              <span>{loading ? "LOADING" : "LIVE API DATA"}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Resolution Rate */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs group hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Resolution Rate</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/50 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">
              {stats.rate}%
            </p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-black">
              <span>TARGET MET (90%)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Avg. Response Time */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs group hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Avg. Response Time</span>
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100 group-hover:bg-slate-100 transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">
              {stats.avgResponse} days
            </p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 font-bold">
              <span>Calculated from resolved complaints</span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Cases */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col justify-between shadow-2xs group hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">Active Cases</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100/50 group-hover:bg-rose-100 transition-colors">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black tracking-tight text-slate-800">
              {stats.active}
            </p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-rose-600 font-black uppercase">
              <span>{stats.active ? "Open from current data" : "No active cases"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Middle row: Bar chart trend vs donut category division */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Monthly Volume bar visualization */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col gap-6 shadow-2xs">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-800" />
              <strong className="text-base text-slate-800 font-black">Monthly Grievance Volume</strong>
            </div>
            
            {/* Legend marker */}
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-800" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Submissions</span>
            </div>
          </div>

          {/* Monthly visual bars stack representing JAN - DEC */}
          <div className="flex flex-col justify-between h-56 pt-3 relative">
            
            {/* Grid line guidelines */}
            <div className="absolute inset-0 flex flex-col justify-between py-1 text-[9px] text-slate-300 font-bold tracking-widest uppercase pointer-events-none">
              <div className="border-b border-dashed border-slate-100/80 w-full" />
              <div className="border-b border-dashed border-slate-100/80 w-full" />
              <div className="border-b border-dashed border-slate-100/80 w-full" />
              <div className="w-full" />
            </div>

            {/* Horizontal timeline of calendar bars */}
            <div className="relative z-10 flex justify-between h-44 items-end px-2 gap-1.5 sm:gap-3">
              {monthlyBuckets.map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group">
                  <div className="relative w-full max-w-[28px] bg-slate-50/50 border border-slate-100/80 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-500 group-hover:opacity-90 
                        ${m.active ? "bg-emerald-850" : "bg-[#0c3127]/25"}`}
                      style={{ height: m.height }}
                    />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider
                    ${m.active ? "text-[#0c3127] font-black" : "text-slate-400"}`}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Concentric ring Category Distribution */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs h-full min-h-[380px]">
          <div className="border-b border-slate-100 pb-4 text-left">
            <strong className="text-base text-slate-800 font-black">Distribution by Category</strong>
          </div>

          {/* Category distribution */}
          <div className="relative flex items-center justify-center py-5">
            <svg width="150" height="150" className="transform -rotate-90">
              <circle cx="75" cy="75" r="55" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
              {categoryBuckets.slice(0, 4).map((bucket, index) => {
                const circumference = 345;
                const ratio = stats.total ? bucket.count / stats.total : 0;
                const dash = `${Math.max(ratio * circumference, 0)} ${circumference}`;
                const offset = -categoryBuckets.slice(0, index).reduce((sum, item) => sum + (stats.total ? item.count / stats.total : 0) * circumference, 0);
                const colors = ["#0c3127", "#059669", "#34d399", "#cbd5e1"];
                return (
                  <circle
                    key={bucket.name}
                    cx="75"
                    cy="75"
                    r="55"
                    fill="transparent"
                    stroke={colors[index]}
                    strokeWidth="16"
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <strong className="text-xl font-black text-slate-800 tracking-tight">{stats.total}</strong>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left mt-3">
            {categoryBuckets.length > 0 ? categoryBuckets.slice(0, 4).map((bucket, index) => {
              const colors = ["bg-[#0c3127]", "bg-emerald-600", "bg-emerald-400", "bg-slate-300"];
              const percent = stats.total ? Math.round((bucket.count / stats.total) * 100) : 0;
              return (
                <div className="space-y-1" key={bucket.name}>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${colors[index]}`} />
                    <span className="text-[11px] font-bold text-slate-500">{bucket.name}</span>
                  </div>
                  <strong className="text-sm font-black text-slate-800 block pl-3.5">{percent}%</strong>
                </div>
              );
            }) : (
              <p className="col-span-2 text-xs text-slate-400 font-semibold text-center">No category data yet.</p>
            )}
          </div>

        </div>

      </div>

      {/* Bottom section split: Performance Table and Priority breakdown sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Departmental performance statistics cards tables */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
            <strong className="text-base text-slate-800 font-black">Departmental Performance</strong>
            <button className="text-xs font-black text-slate-400 hover:text-emerald-800 uppercase tracking-wider cursor-pointer">
              View Detailed Rankings
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Total Cases</th>
                  <th className="px-6 py-4">Avg. Response</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepartments.map((d, index) => {
                  let badge = "bg-slate-50 text-slate-700 border-slate-200";
                  if (d.status === "Excellent") {
                    badge = "bg-emerald-50 text-emerald-800 border-emerald-150 font-bold";
                  } else if (d.status === "Above Target") {
                    badge = "bg-emerald-50 text-emerald-800 border-emerald-150 font-bold";
                  } else if (d.status === "Review Needed") {
                    badge = "bg-rose-50 text-rose-800 border-rose-150 font-bold animate-pulse";
                  }

                  return (
                    <tr key={index} className="hover:bg-slate-50/20 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <strong className="text-xs font-black text-slate-850">{d.name}</strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-bold">
                        {d.cases}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-xs font-extrabold 
                        ${d.status === "Review Needed" ? "text-rose-600" : "text-emerald-700"}`}>
                        {d.response}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[9px] tracking-wider px-2 py-0.5 rounded-lg border uppercase ${badge}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-28 flex items-center gap-2">
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.efficiency}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-450 font-bold">{d.efficiency}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Priority Breakdown cards and Policy marketing alert */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Priority Breakdown list box */}
          <div className="bg-white rounded-3xl border border-slate-202 p-6 shadow-2xs space-y-4 text-left">
            <strong className="text-base text-slate-800 font-black block">Priority Breakdown</strong>

            <div className="space-y-3.5">
              
              {/* High priority card */}
              <div className="border-l-4 border-l-rose-600 bg-rose-50/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">High</span>
                  <p className="text-[11px] text-slate-500 font-medium">Requires action within 24hrs</p>
                </div>
                <strong className="text-2xl font-black text-rose-800">{highPriorityCount}</strong>
              </div>

              {/* Standard priority card */}
              <div className="border-l-4 border-l-slate-400 bg-slate-50/50 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider block">Standard</span>
                  <p className="text-[11px] text-slate-500 font-medium">Within standard 5-day SLA</p>
                </div>
                <strong className="text-2xl font-black text-slate-800">{StandardCount}</strong>
              </div>

            </div>

            {/* Backlog ratio linear indicator */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>In Progress (Backlog)</span>
                <span className="text-slate-800 font-extrabold">
                  {stats.total ? Math.round((statusBuckets.find((item) => item.name === "In Progress")?.count || 0) / stats.total * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full"
                  style={{
                    width: `${stats.total ? Math.round((statusBuckets.find((item) => item.name === "In Progress")?.count || 0) / stats.total * 100) : 0}%`
                  }}
                />
              </div>
            </div>

          </div>

          {/* Policy card component */}
          <div className="bg-[#0c3127] text-white rounded-3xl p-6 shadow-md text-left flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-emerald-900 opacity-20 transform scale-150 pointer-events-none">
              <ShieldCheck className="h-32 w-32" />
            </div>

            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Policy Update</span>
              </div>
              <p className="text-xs text-emerald-100 font-semibold leading-relaxed">
                Review the new Q4 Grievance Resolution guidelines, SLA agreements & documentation requirements.
              </p>
            </div>

            <button 
              onClick={() => alert("Loading official policy documentation logs guidelines...")}
              className="w-full bg-white hover:bg-emerald-50 text-[#0c3127] text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-3xs relative z-10 text-center uppercase"
            >
              Review Policy
            </button>
          </div>

        </div>

      </div>

      {/* Corporate Styled footer elements */}
      <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <span>Â© 2024 University Institutional Oversight. All data processed per privacy guidelines.</span>
        <div className="flex items-center gap-5">
          <button className="hover:text-emerald-800 cursor-pointer" onClick={() => alert("Privacy policy page link...")}>Privacy Policy</button>
          <button className="hover:text-emerald-800 cursor-pointer" onClick={() => alert("Audit logs system parameter...")}>Audit Logs</button>
          <button className="hover:text-emerald-800 cursor-pointer" onClick={() => alert("System status dashboard parameters...")}>System Status</button>
        </div>
      </div>

    </div>
  );
}


