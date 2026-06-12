import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import {
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
  User,
  Layers,
  AlertCircle,
  Info,
  Clock,
  FileText,
} from "lucide-react";

export default function StaffClosedCases() {
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All"); // All, Resolved, Rejected
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await api.get("/complaints/assigned");
        const closed = (res.data || []).filter(
          (c) =>
            String(c.status || "").toLowerCase() === "resolved" ||
            String(c.status || "").toLowerCase() === "rejected"
        );
        setAllComplaints(closed);
        if (closed.length > 0) setSelectedComplaint(closed[0]);
      } catch (err) {
        setLoadError(
          err.response?.data?.detail || "Could not load closed complaints."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return allComplaints.filter((c) => {
      const kw = searchTerm.toLowerCase().trim();
      const matchSearch =
        !kw ||
        (c.creator?.name || "").toLowerCase().includes(kw) ||
        (c.title || "").toLowerCase().includes(kw) ||
        (c.category || "").toLowerCase().includes(kw) ||
        `grv-${c.id}`.includes(kw);

      const s = String(c.status || "").toLowerCase();
      const matchType =
        typeFilter === "All" ||
        (typeFilter === "Resolved" && s === "resolved") ||
        (typeFilter === "Rejected" && s === "rejected");

      return matchSearch && matchType;
    });
  }, [allComplaints, searchTerm, typeFilter]);

  const displayTime = (ds) => {
    if (!ds) return "—";
    try {
      const d = new Date(ds);
      if (isNaN(d)) return "—";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const resolvedCount = allComplaints.filter(
    (c) => String(c.status || "").toLowerCase() === "resolved"
  ).length;
  const rejectedCount = allComplaints.filter(
    (c) => String(c.status || "").toLowerCase() === "rejected"
  ).length;

  return (
    <div className="font-sans text-left pb-12 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-black text-[#0c3127] tracking-tight">
          Closed Cases
        </h1>
        <p className="text-xs text-slate-400 font-bold mt-0.5">
          Historical archive of resolved and rejected grievances
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 flex items-center justify-between shadow-3xs">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 block">
              Total Closed
            </span>
            <span className="text-3xl font-black text-slate-800 block">
              {allComplaints.length}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 flex items-center justify-between shadow-3xs">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 block">
              Resolved
            </span>
            <span className="text-3xl font-black text-slate-800 block">
              {resolvedCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/50">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 flex items-center justify-between shadow-3xs">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 block">
              Rejected
            </span>
            <span className="text-3xl font-black text-slate-800 block">
              {rejectedCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/50">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: list */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Search + filters */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-3xs flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name, category, or ID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {["All", "Resolved", "Rejected"].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setTypeFilter(pill)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === pill
                      ? "bg-[#0c3127] text-white shadow-3xs hover:bg-[#0f4033]"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* List body */}
          {loading ? (
            <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center">
              <div className="h-8 w-8 animate-spin border-2 border-emerald-800 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-slate-400 font-bold mt-3">
                Loading closed cases…
              </p>
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-rose-100 flex flex-col items-center justify-center gap-4">
              <div className="h-14 w-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  Unable to load closed cases
                </p>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  {loadError}
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 flex flex-col items-center justify-center gap-4">
              <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  No closed cases yet
                </p>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Resolved and rejected complaints will appear here once cases
                  are closed.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((c) => {
                const isResolved =
                  String(c.status || "").toLowerCase() === "resolved";
                const isSelected = selectedComplaint?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-6 rounded-3xl border text-left cursor-pointer transition-all duration-200 flex flex-col gap-4 group hover:shadow-xs
                      ${
                        isSelected
                          ? "bg-white border-emerald-800/80 shadow-2xs ring-2 ring-emerald-500/10 border-l-[6px] border-l-[#0c3127]"
                          : "bg-white border-slate-200/95 hover:border-slate-350/80"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}
                      >
                        {isResolved ? "Resolved" : "Rejected"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Closed {displayTime(c.updated_at)}
                      </span>
                    </div>

                    <h3 className="text-slate-900 font-extrabold text-[15px] leading-tight group-hover:text-[#0c3127] transition-colors">
                      {c.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-slate-500 font-semibold border-t border-slate-50 pt-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {c.creator?.name || "Student"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        {c.category || "General"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Opened {displayTime(c.created_at)}
                      </span>
                      <Link
                        to={`/complaints/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-emerald-800 text-[11px] font-extrabold hover:underline"
                      >
                        View Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="lg:col-span-5">
          {selectedComplaint ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col gap-6 shadow-3xs text-left">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-slate-950 font-black text-base tracking-tight">
                  Case #GRV-{String(selectedComplaint.id).padStart(4, "0")}
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {selectedComplaint.title}
                </p>
              </div>

              {/* Student info */}
              <div className="flex items-center gap-3.5 bg-slate-50/60 border border-slate-150 rounded-2xl p-4">
                <div className="h-11 w-11 rounded-xl bg-[#0c3127] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {selectedComplaint.creator?.name
                    ? selectedComplaint.creator.name.charAt(0).toUpperCase()
                    : "S"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 block truncate">
                    {selectedComplaint.creator?.name || "Student"}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-extrabold block truncate mt-0.5 uppercase tracking-wide">
                    Case ID: {String(selectedComplaint.id).padStart(4, "0")} •{" "}
                    {selectedComplaint.category || "General"}
                  </p>
                </div>
              </div>

              {/* Outcome badge */}
              <div className="flex items-center gap-3">
                {String(selectedComplaint.status || "").toLowerCase() ===
                "resolved" ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                      Resolved
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                      Rejected
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-slate-400 font-bold">
                  Closed on {displayTime(selectedComplaint.updated_at)}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">
                  Complaint Description
                </span>
                <div className="text-slate-600 text-xs font-semibold leading-relaxed relative py-1">
                  <span className="text-slate-300 font-serif text-3xl select-none absolute -left-1 -top-3 block">
                    "
                  </span>
                  <div className="pl-4 italic whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </div>
                </div>
              </div>

              {/* Resolution notes */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">
                  Resolution Notes
                </span>
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] text-slate-600 font-semibold whitespace-pre-wrap leading-relaxed">
                    {selectedComplaint.resolution_notes ||
                      "No resolution notes were recorded for this case."}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Opened", value: displayTime(selectedComplaint.created_at) },
                  { label: "Closed", value: displayTime(selectedComplaint.updated_at) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">
                      {label}
                    </span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to={`/complaints/${selectedComplaint.id}`}
                className="w-full bg-[#0c3127] hover:bg-[#0f4033] text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-3xs active:scale-98 transition-all"
              >
                Open Full Case Record
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 p-16 rounded-3xl text-center shadow-3xs flex flex-col items-center justify-center gap-4 min-h-[300px]">
              <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  No case selected
                </p>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Select a closed case to preview its record.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-1.5 rounded-xl bg-emerald-100 text-[#0c3127] shrink-0">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div>
          <strong className="text-[10px] font-black uppercase text-[#0c3127] tracking-wider block">
            Records Policy
          </strong>
          <p className="text-[11px] text-emerald-900 font-medium leading-relaxed mt-0.5">
            Closed cases are read-only. If a resolution needs to be revisited,
            contact your administrator to reopen the case.
          </p>
        </div>
      </div>
    </div>
  );
}