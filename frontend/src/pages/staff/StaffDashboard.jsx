import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import {
  ClipboardCheck,
  History,
  BarChart3,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  XCircle,
  Activity,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS = {
  submitted: "Submitted",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

function normaliseStatus(raw) {
  return String(raw || "").toLowerCase().trim();
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function relativeTime(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(dateString);
  } catch {
    return "";
  }
}

// ─── status badge config ────────────────────────────────────────────────────

const STATUS_CONFIG = {
  submitted: {
    label: "Submitted",
    icon: FileText,
    badge: "bg-slate-100 text-slate-700 border border-slate-200",
    dot: "bg-slate-400",
  },
  "under review": {
    label: "Under Review",
    icon: Clock,
    badge: "bg-amber-50 text-amber-800 border border-amber-200",
    dot: "bg-amber-400",
  },
  "in progress": {
    label: "In Progress",
    icon: Activity,
    badge: "bg-blue-50 text-blue-800 border border-blue-200",
    dot: "bg-blue-500",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badge: "bg-rose-50 text-rose-800 border border-rose-200",
    dot: "bg-rose-500",
  },
};

function StatusBadge({ status }) {
  const s = normaliseStatus(status);
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG["submitted"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div className={`bg-white border rounded-2xl p-5 flex flex-col gap-3 shadow-sm ${accent || "border-slate-150"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${accent ? "bg-emerald-50 text-[#0c3127]" : "bg-slate-50 text-slate-400"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <span className="text-3xl font-black text-slate-800 tabular-nums leading-none">{value}</span>
        {sub != null && (
          <span className="text-[10px] text-slate-400 font-semibold ml-2">{sub}</span>
        )}
      </div>
    </div>
  );
}

// ─── quick action card ───────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, title, description, badge }) {
  return (
    <Link
      to={to}
      className="bg-white border border-slate-150 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-[#0c3127]/30 hover:shadow-md transition-all group"
    >
      <div className="h-11 w-11 rounded-xl bg-emerald-50 text-[#0c3127] flex items-center justify-center shrink-0 group-hover:bg-[#0c3127] group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-slate-800">{title}</span>
          {badge != null && (
            <span className="bg-[#0c3127] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-[#0c3127] transition-colors shrink-0" />
    </Link>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function StaffDashboard() {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await api.get("/complaints/assigned");
        setComplaints(res.data || []);
      } catch (err) {
        console.error("StaffDashboard: failed to load assigned complaints", err);
        setLoadError(err.response?.data?.detail || "Could not load complaints.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── derived counts ──────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const total = complaints.length;
    let submitted = 0, underReview = 0, inProgress = 0, resolved = 0, rejected = 0;
    for (const c of complaints) {
      const s = normaliseStatus(c.status);
      if (s === "submitted") submitted++;
      else if (s === "under review") underReview++;
      else if (s === "in progress") inProgress++;
      else if (s === "resolved") resolved++;
      else if (s === "rejected") rejected++;
    }
    const active = submitted + underReview + inProgress;
    const closed = resolved + rejected;
    return { total, submitted, underReview, inProgress, resolved, rejected, active, closed };
  }, [complaints]);

  // ── recent activity: last 8 complaints sorted by updated_at desc ────────
  const recentActivity = useMemo(() => {
    return [...complaints]
      .sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);
  }, [complaints]);

  // ─── loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#0c3127]" />
        <span className="text-sm font-bold">Loading dashboard…</span>
      </div>
    );
  }

  // ─── error state ──────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-14 w-14 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100">
          <AlertCircle className="h-7 w-7 text-rose-500" />
        </div>
        <p className="text-sm font-extrabold text-slate-800">Failed to load dashboard</p>
        <p className="text-xs text-slate-400 font-semibold">{loadError}</p>
      </div>
    );
  }

  // ─── main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">

      {/* ── page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0c3127] text-white flex items-center justify-center shadow-sm">
            <span className="text-base font-black">{user?.name ? user.name[0].toUpperCase() : "S"}</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-tight">
              Welcome back, {user?.name?.split(" ")[0] || "Staff"}
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Here's an overview of your assigned cases
            </p>
          </div>
        </div>
      </div>

      {/* ── stat grid ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10.5px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Case Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total Assigned"
            value={counts.total}
            icon={ClipboardCheck}
            accent="border-[#0c3127]/20"
          />
          <StatCard
            label="Submitted"
            value={counts.submitted}
            icon={FileText}
          />
          <StatCard
            label="Under Review"
            value={counts.underReview}
            icon={Clock}
          />
          <StatCard
            label="In Progress"
            value={counts.inProgress}
            icon={Activity}
          />
          <StatCard
            label="Resolved"
            value={counts.resolved}
            icon={CheckCircle2}
            accent="border-emerald-200"
          />
          <StatCard
            label="Rejected"
            value={counts.rejected}
            icon={XCircle}
          />
        </div>
      </section>

      {/* ── body: activity + quick actions ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* recent activity ── spans 2/3 on large screens */}
        <section className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-[10.5px] font-black uppercase tracking-widest text-slate-400">
            Recent Activity
          </h2>

          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                  <ClipboardCheck className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm font-extrabold text-slate-700">No complaints assigned yet</p>
                <p className="text-xs text-slate-400 font-semibold max-w-xs">
                  Cases assigned to you will appear here once students submit grievances.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {recentActivity.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/complaints/${c.id}`}
                      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* avatar */}
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#0c3127] flex items-center justify-center font-black text-xs shrink-0">
                        {c.creator?.name ? c.creator.name[0].toUpperCase() : "S"}
                      </div>

                      {/* main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-black text-slate-800 truncate">
                            {c.title || `Case #${String(c.id).padStart(4, "0")}`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                            GRV-{String(c.id).padStart(4, "0")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {c.category && (
                            <span className="text-[10px] text-slate-400 font-semibold">{c.category}</span>
                          )}
                          {c.creator?.name && (
                            <span className="text-[10px] text-slate-400 font-semibold">· {c.creator.name}</span>
                          )}
                        </div>
                      </div>

                      {/* right side: status + date */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge status={c.status} />
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {relativeTime(c.updated_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* footer link */}
            {recentActivity.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/40">
                <Link
                  to="/staff/complaints"
                  className="text-[11px] font-black text-[#0c3127] hover:underline flex items-center gap-1"
                >
                  View all active cases
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* quick actions ── 1/3 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[10.5px] font-black uppercase tracking-widest text-slate-400">
            Quick Actions
          </h2>

          <div className="flex flex-col gap-3">
            <QuickAction
              to="/staff/complaints"
              icon={ClipboardCheck}
              title="Active Cases"
              description="Review, update, and resolve open complaints"
              badge={counts.active > 0 ? counts.active : undefined}
            />
            <QuickAction
              to="/staff/closed"
              icon={History}
              title="Closed Cases"
              description="Browse resolved and rejected complaint history"
              badge={counts.closed > 0 ? counts.closed : undefined}
            />
            <QuickAction
              to="/staff/analytics"
              icon={BarChart3}
              title="Analytics"
              description="Track resolution rates and performance metrics"
            />
          </div>

          {/* workload summary card */}
          {counts.total > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mt-1 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0c3127]" />
                <span className="text-[10.5px] font-black uppercase tracking-widest text-[#0c3127]">
                  Workload Summary
                </span>
              </div>

              {/* resolution rate bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-emerald-800">Resolution Rate</span>
                  <span className="text-[11px] font-black text-[#0c3127]">
                    {counts.total > 0
                      ? Math.round((counts.resolved / counts.total) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0c3127] rounded-full transition-all duration-500"
                    style={{
                      width: `${counts.total > 0 ? Math.round((counts.resolved / counts.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white/70 rounded-xl p-2.5 text-center border border-emerald-100/60">
                  <span className="block text-lg font-black text-slate-800 tabular-nums leading-none">
                    {counts.active}
                  </span>
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 mt-1">
                    Pending
                  </span>
                </div>
                <div className="bg-white/70 rounded-xl p-2.5 text-center border border-emerald-100/60">
                  <span className="block text-lg font-black text-slate-800 tabular-nums leading-none">
                    {counts.closed}
                  </span>
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 mt-1">
                    Closed
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}