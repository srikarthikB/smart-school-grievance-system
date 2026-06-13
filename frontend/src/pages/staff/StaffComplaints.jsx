import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  X, 
  User, 
  Layers, 
  ChevronRight, 
  Clock, 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  FileText, 
  ArrowUpRight,
  Info
} from "lucide-react";

export default function StaffComplaints() {
  const { user } = useAuth();
  
  const [assignedComplaints, setAssignedComplaints] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [statusDraft, setStatusDraft] = useState("Under Review");
  const [resolutionNotesDraft, setResolutionNotesDraft] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const resAssigned = await api.get("/complaints/assigned");
      const assigned = resAssigned.data || [];
      
      setAssignedComplaints(assigned);

      if (assigned.length > 0) {
        setSelectedComplaint((current) => assigned.find((c) => c.id === current?.id) || assigned[0]);
      } else {
        setSelectedComplaint(null);
      }
    } catch (err) {
      console.error("Failed to load staff complaints", err);
      setAssignedComplaints([]);
      setSelectedComplaint(null);
      setLoadError(err.response?.data?.detail || "Could not load assigned complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedComplaint) {
      setStatusDraft(selectedComplaint.status || "Under Review");
      setResolutionNotesDraft(selectedComplaint.resolution_notes || "");
      setShowStatusPopover(false);
      setActionSuccessMessage("");
    }
  }, [selectedComplaint]);

  const filteredComplaints = useMemo(() => {
    return assignedComplaints.filter((c) => {
      const keyword = searchTerm.toLowerCase().trim();
      const creatorName = (c.creator?.name || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const category = (c.category || "").toLowerCase();
      const matchesSearch = !keyword || 
        creatorName.includes(keyword) || 
        title.includes(keyword) || 
        category.includes(keyword) || 
        `grv-${c.id}`.includes(keyword);

      const s = String(c.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "Submitted") {
        matchesStatus = s === "submitted";
      } else if (statusFilter === "Under Review") {
        matchesStatus = s === "under review";
      } else if (statusFilter === "In Progress") {
        matchesStatus = s === "in progress";
      } else if (statusFilter === "Resolved") {
        matchesStatus = s === "resolved";
      } else if (statusFilter === "Rejected") {
        matchesStatus = s === "rejected";
      }

      return matchesSearch && matchesStatus;
    });
  }, [assignedComplaints, searchTerm, statusFilter]);

  const handleConfirmStatusUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint) return;
    try {
      await api.patch(`/complaints/${selectedComplaint.id}/status`, {
        status: statusDraft,
        resolution_notes: resolutionNotesDraft
      });
      setShowStatusPopover(false);
      setActionSuccessMessage(`Updated status to "${statusDraft}" successfully.`);
      setTimeout(() => setActionSuccessMessage(""), 4000);
      
      const resAssigned = await api.get("/complaints/assigned");
      setAssignedComplaints(resAssigned.data || []);
      
      const freshInstance = (resAssigned.data || []).find(c => c.id === selectedComplaint.id);
      if (freshInstance) {
        setSelectedComplaint(freshInstance);
      }
    } catch (err) {
      console.error("Failed to update status", err);
      setActionSuccessMessage(err.response?.data?.detail || "Failed to update status.");
    }
  };

  // Fixed: Medium now correctly shows "Medium", not "HIGH"
  const getPriorityTag = (p) => {
    const priority = String(p || "").toLowerCase();
    if (priority === "high") {
      return { label: "High", style: "bg-rose-50 text-rose-700 border-rose-150 border font-extrabold" };
    }
    if (priority === "medium") {
      return { label: "Medium", style: "bg-amber-50 text-amber-700 border-amber-150 border font-extrabold" };
    }
    return { label: "Standard", style: "bg-slate-100 text-slate-600 border-slate-200 border font-bold" };
  };

  // Fixed: removed duplicate "in progress" branch; each status maps to one style
  const getStatusBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "resolved") {
      return "bg-[#f0fdf4] text-emerald-800 border border-emerald-100";
    }
    if (s === "in progress") {
      return "bg-rose-50 text-rose-800 border border-rose-150";
    }
    if (s === "under review") {
      return "bg-amber-50 text-amber-850 border border-amber-150";
    }
    if (s === "rejected") {
      return "bg-slate-100 text-slate-700 border border-slate-200";
    }
    return "bg-slate-50 text-slate-600 border border-slate-200";
  };

  const displayTime = (dateString) => {
    if (!dateString) return "No date";
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return "No date";
      return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "No date";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-2 border-emerald-800 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-400 font-bold mt-3">Loading assigned complaints…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left pb-12">
      
      {/* Page header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-black text-[#0c3127] tracking-tight">Active Cases</h1>
        <p className="text-xs text-slate-400 font-bold mt-0.5">Review and resolve complaints assigned to you</p>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-800 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{loadError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left: complaint list */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, or ID..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127]"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
            {["All", "Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === f
                    ? "bg-[#0c3127] text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex flex-col gap-3">
            {filteredComplaints.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500 mt-3">No complaints match your filters</p>
              </div>
            ) : filteredComplaints.map((c) => {
              const priorityTag = getPriorityTag(c.priority);
              const isSelected = selectedComplaint?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm ${
                    isSelected ? "border-[#0c3127] ring-1 ring-[#0c3127]/20 shadow-sm" : "border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-400 font-black uppercase">GRV-{String(c.id).padStart(4, "0")}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${priorityTag.style}`}>{priorityTag.label}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-800 leading-tight truncate">{c.title}</h3>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {c.creator?.name || "Student"} · {c.category}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold shrink-0 ${getStatusBadgeStyle(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-2">{displayTime(c.created_at)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm sticky top-6">

              {/* Header */}
              <div className="bg-[#0c3127] text-white p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider block">
                    Case GRV-{String(selectedComplaint.id).padStart(4, "0")}
                  </span>
                  <h3 className="font-extrabold text-white text-base mt-0.5 leading-tight">{selectedComplaint.title}</h3>
                </div>
                <button onClick={() => setSelectedComplaint(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5 max-h-[78vh] overflow-y-auto">

                {/* Success / error message */}
                {actionSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {actionSuccessMessage}
                  </div>
                )}

                {/* Student identity */}
                <div className="flex items-center gap-3.5 bg-slate-50/60 border border-slate-150 rounded-2xl p-4">
                  <div className="h-11 w-11 rounded-xl bg-[#0c3127] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                    {selectedComplaint.creator?.name ? selectedComplaint.creator.name.charAt(0).toUpperCase() : "S"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 block truncate">{selectedComplaint.creator?.name || "Student"}</h4>
                    <p className="text-[10px] text-slate-400 font-extrabold block truncate mt-0.5 uppercase tracking-wide">
                      Case ID: {String(selectedComplaint.id).padStart(4, "0")} · {selectedComplaint.category}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">Complaint Description</span>
                  <div className="text-slate-600 text-xs font-semibold leading-relaxed relative py-1">
                    <span className="text-slate-300 font-serif text-3xl select-none absolute -left-1 -top-3 block">"</span>
                    <div className="pl-4 italic whitespace-pre-wrap">{selectedComplaint.description}</div>
                  </div>
                </div>

                {/* Attachments */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">Attached Evidence</span>
                  <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                    <span className="text-[11px] text-slate-400 italic font-semibold">Attachment support is planned for a future release.</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">Complaint Timeline</span>
                  <div className="relative pl-3 font-semibold space-y-4">
                    <div className="absolute top-1.5 bottom-1.5 left-[15px] w-[1px] bg-slate-200" />
                    {/* Current status entry */}
                    <div className="relative pl-5 flex items-start gap-2">
                      <div className="absolute left-[0.2px] top-1.5 h-2 w-2 rounded-full bg-emerald-800 ring-4 ring-emerald-50" />
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">{displayTime(selectedComplaint.updated_at)}</span>
                        <strong className="text-[11px] text-slate-800 block">{selectedComplaint.status || "Submitted"}</strong>
                        <span className="text-[11px] text-slate-500 block">{selectedComplaint.resolution_notes || "No resolution notes logged."}</span>
                      </div>
                    </div>
                    {/* Creation entry */}
                    <div className="relative pl-5 flex items-start gap-2">
                      <div className="absolute left-[0.2px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">{displayTime(selectedComplaint.created_at)}</span>
                        <strong className="text-[11px] text-slate-800 block">Submitted</strong>
                        <span className="text-[11px] text-slate-500 block">Complaint record created.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Notes */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">Resolution Notes</span>
                  <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4">
                    <span className="text-[11px] text-slate-500 font-semibold whitespace-pre-wrap">
                      {selectedComplaint.resolution_notes || "No resolution notes added yet."}
                    </span>
                  </div>
                </div>

                {/* Status Update Form */}
                {showStatusPopover ? (
                  <div className="bg-slate-50 border border-emerald-800/10 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <History className="h-4 w-4 text-emerald-800" />
                        Update Case Status
                      </span>
                      <button onClick={() => setShowStatusPopover(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Set Status</label>
                        <select
                          value={statusDraft}
                          onChange={(e) => setStatusDraft(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0c3127] cursor-pointer"
                        >
                          {["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Resolution Notes</label>
                        <textarea
                          value={resolutionNotesDraft}
                          onChange={(e) => setResolutionNotesDraft(e.target.value)}
                          placeholder="Provide details about actions taken..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] min-h-[85px] resize-y"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0c3127] hover:bg-[#0f4033] py-3 tracking-wider font-black text-xs text-white rounded-xl uppercase shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        Confirm Update
                      </button>
                    </form>
                  </div>
                ) : null}

                {/* Primary CTA */}
                <button 
                  type="button"
                  onClick={() => setShowStatusPopover(true)}
                  className="w-full bg-[#0c3127] hover:bg-[#0f4033] text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-98 transition-all mt-1"
                >
                  <span>Update Status / Mark Resolved</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>

                {/* Link to full detail page */}
                <Link
                  to={`/complaints/${selectedComplaint.id}`}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Full Case Record
                </Link>

              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 p-16 rounded-3xl text-center shadow-3xs flex flex-col items-center justify-center gap-4 min-h-[400px]">
              <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">No complaint selected</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">Select any case from the list to preview details and resolve.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SLA Notice */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-start gap-3.5 text-left">
        <div className="p-1.5 rounded-xl bg-emerald-100 text-[#0c3127] shrink-0">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div>
          <strong className="text-[10px] font-black uppercase text-[#0c3127] tracking-wider block">Resolution SLA Notice</strong>
          <p className="text-[11px] text-emerald-900 font-medium leading-relaxed mt-0.5">
            Staff members are required to submit investigative remarks within 24 working hours. Ensure student anonymity is strictly respected if indicated on the report.
          </p>
        </div>
      </div>

    </div>
  );
}