import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/client";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Layers,
  XCircle,
  Info,
} from "lucide-react";

// ────────────────────────────────────────────────
// Tiny inline bar component — no external chart lib
// ────────────────────────────────────────────────
function BarRow({ label, value, max, color = "#0c3127" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-slate-600 w-32 shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-black text-slate-700 w-6 text-right shrink-0">
        {value}
      </span>
    </div>
  );
}

// A simple donut-style visual using SVG
function DonutSegment({ resolved, rejected, pending, total }) {
  if (total === 0)
    return (
      <div className="h-28 w-28 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
        <span className="text-[10px] text-slate-400 font-bold">No data</span>
      </div>
    );

  const r = 40;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { value: resolved, color: "#059669" },
    { value: rejected, color: "#e11d48" },
    { value: pending, color: "#f59e0b" },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circumference;
    const arc = { dash, offset, color: seg.color };
    offset += dash;
    return arc;
  });

  return (
    <svg viewBox="0 0 112 112" className="h-28 w-28 mx-auto -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth="16"
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
        />
      ))}
    </svg>
  );
}

export default function StaffAnalytics() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/complaints/assigned");
        setComplaints(res.data || []);
      } catch (err) {
        setLoadError(
          err.response?.data?.detail || "Could not load analytics data."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = complaints.length;
    const resolved = complaints.filter(
      (c) => String(c.status || "").toLowerCase() === "resolved"
    ).length;
    const rejected = complaints.filter(
      (c) => String(c.status || "").toLowerCase() === "rejected"
    ).length;
    const pending = total - resolved - rejected;

    const resolutionRate =
      total > 0 ? Math.round(((resolved + rejected) / total) * 100) : 0;

    // Category breakdown
    const categoryMap = {};
    complaints.forEach((c) => {
      const cat = c.category || "Uncategorised";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Priority breakdown
    const priorityMap = { High: 0, Medium: 0, Low: 0 };
    complaints.forEach((c) => {
      const p = String(c.priority || "").toLowerCase();
      if (p === "high") priorityMap["High"]++;
      else if (p === "medium") priorityMap["Medium"]++;
      else priorityMap["Low"]++;
    });

    // Avg resolution time (days) for resolved cases that have both dates
    let avgDays = null;
    const timed = complaints.filter(
      (c) =>
        String(c.status || "").toLowerCase() === "resolved" &&
        c.created_at &&
        c.updated_at
    );
    if (timed.length > 0) {
      const totalMs = timed.reduce((acc, c) => {
        return acc + (new Date(c.updated_at) - new Date(c.created_at));
      }, 0);
      avgDays = (totalMs / timed.length / 86400000).toFixed(1);
    }

    // Monthly trend — group resolved by month (last 6 months)
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: d.toLocaleDateString("en-US", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0,
      };
    });
    complaints.forEach((c) => {
      if (
        String(c.status || "").toLowerCase() !== "resolved" ||
        !c.updated_at
      )
        return;
      const d = new Date(c.updated_at);
      const hit = months.find(
        (m) => m.year === d.getFullYear() && m.month === d.getMonth()
      );
      if (hit) hit.count++;
    });

    return {
      total,
      resolved,
      rejected,
      pending,
      resolutionRate,
      categories,
      priorityMap,
      avgDays,
      months,
    };
  }, [complaints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-2 border-emerald-800 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-400 font-bold mt-3">
            Building analytics…
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center border border-rose-100 flex flex-col items-center justify-center gap-4 max-w-md mx-auto mt-12">
        <div className="h-14 w-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-800">
            Analytics unavailable
          </p>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  const maxMonth = Math.max(...stats.months.map((m) => m.count), 1);
  const maxCategory = stats.categories[0]?.[1] || 1;

  return (
    <div className="font-sans text-left pb-12 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-black text-[#0c3127] tracking-tight">
          Analytics
        </h1>
        <p className="text-xs text-slate-400 font-bold mt-0.5">
          Performance metrics derived from your assigned caseload
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Assigned",
            value: stats.total,
            icon: Layers,
            bg: "bg-slate-50",
            icon_color: "text-slate-500",
            border: "border-slate-100",
          },
          {
            label: "Resolved",
            value: stats.resolved,
            icon: CheckCircle2,
            bg: "bg-emerald-50",
            icon_color: "text-emerald-700",
            border: "border-emerald-100/50",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: Clock,
            bg: "bg-amber-50",
            icon_color: "text-amber-600",
            border: "border-amber-100/50",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            icon: XCircle,
            bg: "bg-rose-50",
            icon_color: "text-rose-600",
            border: "border-rose-100/50",
          },
        ].map(({ label, value, icon: Icon, bg, icon_color, border }) => (
          <div
            key={label}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 flex items-center justify-between shadow-3xs"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                {label}
              </span>
              <span className="text-2xl font-black text-slate-800 block">
                {value}
              </span>
            </div>
            <div
              className={`h-10 w-10 rounded-2xl ${bg} ${icon_color} flex items-center justify-center border ${border}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: donut + resolution rate + avg days */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Donut */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-3xs flex flex-col gap-4">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Case Breakdown
          </span>
          <DonutSegment
            resolved={stats.resolved}
            rejected={stats.rejected}
            pending={stats.pending}
            total={stats.total}
          />
          <div className="flex flex-col gap-2 mt-1">
            {[
              { label: "Resolved", color: "bg-emerald-500", val: stats.resolved },
              { label: "Rejected", color: "bg-rose-500", val: stats.rejected },
              { label: "Pending", color: "bg-amber-400", val: stats.pending },
            ].map(({ label, color, val }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="text-[11px] font-semibold text-slate-500">
                    {label}
                  </span>
                </div>
                <span className="text-[11px] font-black text-slate-700">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution rate */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-3xs flex flex-col justify-between gap-4">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Resolution Rate
          </span>
          <div className="flex flex-col items-center gap-3">
            <span className="text-6xl font-black text-[#0c3127] tracking-tighter">
              {stats.resolutionRate}
              <span className="text-2xl text-slate-400">%</span>
            </span>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-[#0c3127] transition-all duration-700"
                style={{ width: `${stats.resolutionRate}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold text-center">
            {stats.resolved + stats.rejected} of {stats.total} cases closed
          </p>
        </div>

        {/* Avg resolution time */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-3xs flex flex-col justify-between gap-4">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Avg. Resolution Time
          </span>
          <div className="flex flex-col items-center gap-2">
            {stats.avgDays !== null ? (
              <>
                <span className="text-6xl font-black text-[#0c3127] tracking-tighter">
                  {stats.avgDays}
                  <span className="text-xl text-slate-400 ml-1">days</span>
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] text-emerald-700 font-bold">
                    Based on {complaints.filter(
                      (c) => String(c.status || "").toLowerCase() === "resolved"
                    ).length} resolved cases
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <span className="text-sm font-extrabold text-slate-400">
                  No resolved cases yet
                </span>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                  Time will be calculated once cases are resolved.
                </p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-semibold text-center">
            From submission to resolution
          </p>
        </div>
      </div>

      {/* Bottom row: category breakdown + monthly trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Category breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-3xs flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#0c3127]" />
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Cases by Category
            </span>
          </div>

          {stats.categories.length === 0 ? (
            <p className="text-[11px] text-slate-400 font-semibold italic">
              No category data available.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.categories.map(([cat, count]) => (
                <BarRow
                  key={cat}
                  label={cat}
                  value={count}
                  max={maxCategory}
                  color="#0c3127"
                />
              ))}
            </div>
          )}
        </div>

        {/* Monthly resolved trend */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-3xs flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0c3127]" />
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Resolutions — Last 6 Months
            </span>
          </div>

          <div className="flex items-end gap-2 h-28 pt-2">
            {stats.months.map((m) => {
              const heightPct =
                maxMonth > 0 ? Math.round((m.count / maxMonth) * 100) : 0;
              return (
                <div
                  key={`${m.label}-${m.year}`}
                  className="flex-1 flex flex-col items-center gap-1.5 group"
                >
                  <span className="text-[10px] font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                  <div className="w-full flex items-end justify-center h-20">
                    <div
                      className="w-full rounded-t-lg bg-[#0c3127] transition-all duration-500 group-hover:bg-emerald-700"
                      style={{
                        height: `${Math.max(heightPct, m.count > 0 ? 8 : 4)}%`,
                        minHeight: "4px",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>

          {stats.months.every((m) => m.count === 0) && (
            <p className="text-[11px] text-slate-400 font-semibold italic -mt-2">
              No resolutions recorded in the past 6 months.
            </p>
          )}
        </div>
      </div>

      {/* Priority distribution */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-3xs flex flex-col gap-5">
        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
          Priority Distribution
        </span>
        <div className="flex flex-col gap-3">
          {[
            { label: "High Priority", value: stats.priorityMap["High"], color: "#e11d48" },
            { label: "Medium Priority", value: stats.priorityMap["Medium"], color: "#f59e0b" },
            { label: "Standard", value: stats.priorityMap["Low"], color: "#64748b" },
          ].map(({ label, value, color }) => (
            <BarRow
              key={label}
              label={label}
              value={value}
              max={stats.total || 1}
              color={color}
            />
          ))}
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-1.5 rounded-xl bg-emerald-100 text-[#0c3127] shrink-0">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div>
          <strong className="text-[10px] font-black uppercase text-[#0c3127] tracking-wider block">
            Data Scope
          </strong>
          <p className="text-[11px] text-emerald-900 font-medium leading-relaxed mt-0.5">
            All figures are derived from complaints assigned to your account.
            Contact your administrator for institution-wide analytics.
          </p>
        </div>
      </div>
    </div>
  );
}