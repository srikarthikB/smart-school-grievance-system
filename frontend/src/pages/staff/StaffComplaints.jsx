import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import ComplaintStatusBadge from "../../components/ComplaintStatusBadge.jsx";
import RepairWorkflow from "../../components/RepairWorkflow.jsx";
import { formatErrorMessage } from "../../utils/errorMessage.js";
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
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
      setStatusDraft("In Progress");
      setResolutionNotesDraft(selectedComplaint.resolution_notes || "");
      setShowStatusPopover(false);
      setActionSuccessMessage("");
      setActionErrorMessage("");
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
      } else if (statusFilter === "Awaiting Verification") {
        matchesStatus = s === "awaiting verification";
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
    setActionErrorMessage("");
    setActionSuccessMessage("");
    setUpdatingStatus(true);
    try {
      await api.patch(`/complaints/${selectedComplaint.id}/status`, {
        status: "In Progress",
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
      setActionErrorMessage(formatErrorMessage(err, "Failed to update status."));
    } finally {
      setUpdatingStatus(false);
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
            {["All", "Submitted", "Under Review", "In Progress", "Awaiting Verification", "Resolved", "Rejected"].map((f) => (
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
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  aria-pressed={isSelected}
                  className={`w-full text-left bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127] ${
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
                    <ComplaintStatusBadge status={c.status} className="shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-2">{displayTime(c.created_at)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">

              {/* Header */}
              <div className="bg-[#0c3127] text-white px-4 py-4 sm:px-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">
                      GRV-{String(selectedComplaint.id).padStart(4, "0")}
                    </span>
                    <ComplaintStatusBadge status={selectedComplaint.status} />
                  </div>
                  <h3 className="font-extrabold text-white text-base mt-1 leading-tight break-words">{selectedComplaint.title}</h3>
                </div>
                <button type="button" aria-label="Close complaint details" onClick={() => setSelectedComplaint(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <X aria-hidden="true" className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 flex flex-col gap-4">

                {/* Success / error message */}
                {actionSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {actionSuccessMessage}
                  </div>
                )}
                {actionErrorMessage && (
                  <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                    {actionErrorMessage}
                  </div>
                )}

                {/* Student identity */}
                <section aria-label="Complaint details" className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student</dt>
                      <dd className="mt-0.5 text-xs font-bold text-slate-800 break-words">{selectedComplaint.creator?.name || "Student"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</dt>
                      <dd className="mt-0.5 text-xs font-bold text-slate-800 break-words">{selectedComplaint.category || "Not specified"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted</dt>
                      <dd className="mt-0.5 text-xs font-semibold text-slate-700">{displayTime(selectedComplaint.created_at)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</h4>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700 whitespace-pre-wrap break-words">{selectedComplaint.description || "No description provided."}</p>
                  </div>
                </section>

                {/* Timeline */}
                <details className="group rounded-xl border border-slate-200 px-4 py-3">
                  <summary className="cursor-pointer list-none text-xs font-extrabold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127] [&::-webkit-details-marker]:hidden">
                    Complaint timeline <span className="font-medium text-slate-400">(show history)</span>
                  </summary>
                  <div className="relative mt-4 pl-3 font-semibold space-y-4">
                    <div className="absolute top-1.5 bottom-1.5 left-[15px] w-[1px] bg-slate-200" />
                    {/* Current status entry */}
                    <div className="relative pl-5 flex items-start gap-2">
                      <div className="absolute left-[0.2px] top-1.5 h-2 w-2 rounded-full bg-emerald-800 ring-4 ring-emerald-50" />
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">{displayTime(selectedComplaint.updated_at)}</span>
                        <ComplaintStatusBadge status={selectedComplaint.status} />
                        {selectedComplaint.resolution_notes?.trim() && <span className="text-[11px] text-slate-500 block whitespace-pre-wrap break-words">{selectedComplaint.resolution_notes}</span>}
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
                </details>

                {/* Resolution Notes */}
                {selectedComplaint.resolution_notes?.trim() && (
                  <section aria-label="Resolution notes" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolution notes</h4>
                    <p className="mt-1 text-xs font-medium text-slate-700 whitespace-pre-wrap break-words">{selectedComplaint.resolution_notes}</p>
                  </section>
                )}

                <RepairWorkflow
                  complaintId={selectedComplaint.id}
                  mode="staff"
                  status={selectedComplaint.status}
                  assignedToCurrentUser={selectedComplaint.assigned_to === user?.id}
                  onUpdated={loadData}
                  compact
                />

                {/* Status Update Form */}
                {showStatusPopover ? (
                  <div id="staff-status-update-form" className="bg-slate-50 border border-emerald-800/10 rounded-2xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <History className="h-4 w-4 text-emerald-800" />
                        Work Status Update
                      </span>
                      <button type="button" aria-label="Close status update form" onClick={() => setShowStatusPopover(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127]">
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                        <select
                          value={statusDraft}
                          onChange={(e) => setStatusDraft(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0c3127] cursor-pointer"
                        >
                          {["In Progress"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Case Resolution Notes</label>
                        <textarea
                          value={resolutionNotesDraft}
                          onChange={(e) => setResolutionNotesDraft(e.target.value)}
                          placeholder="Record case-level investigative remarks..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] min-h-[85px] resize-y"
                        />
                        <p className="text-[10px] leading-relaxed text-slate-500">Saved to the complaint record. The repair completion note is recorded separately with its verification evidence.</p>
                      </div>

                      <button
                        type="submit"
                        disabled={updatingStatus}
                        className="w-full bg-[#0c3127] hover:bg-[#0f4033] py-3 tracking-wider font-black text-xs text-white rounded-xl uppercase shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        {updatingStatus ? "Saving..." : "Save Status Update"}
                      </button>
                    </form>
                  </div>
                ) : null}

                {/* Primary CTA */}
                {["Under Review", "In Progress"].includes(selectedComplaint.status) && !showStatusPopover && <button
                  type="button"
                  onClick={() => {
                    setStatusDraft("In Progress");
                    setActionErrorMessage("");
                    setShowStatusPopover(true);
                  }}
                  className="w-full bg-[#0c3127] hover:bg-[#0f4033] text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-98 transition-all mt-1"
                >
                  <span>{selectedComplaint.status === "Under Review" ? "Start Work" : "Update Work Status"}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>}

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
