import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";
import { 
  FileText, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Printer, 
  Download, 
  Send, 
  Check, 
  ArrowLeft, 
  History, 
  UserCheck,
  AlertCircle
} from "lucide-react";

export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  
  // Existing state management
  const [complaint, setComplaint] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState("Under Review");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const [attachments, setAttachments] = useState([]);

  function load() {
    setLoadError("");
    api.get(`/complaints/${id}`)
      .then((res) => {
        setComplaint(res.data);
        setStatus(res.data.status);
        setNotes(res.data.resolution_notes || "");
      })
      .catch((err) => {
        console.error("Failed to load complaint", err);
        setComplaint(null);
        setLoadError(err.response?.data?.detail || "Could not load complaint.");
      });
    api.get(`/feedback/${id}`)
      .then((res) => setFeedback(res.data))
      .catch(() => setFeedback(null));
  }

  useEffect(() => {
    load();
  }, [id]);

  // Existing update handler preserved
  async function updateStatus(e) {
    if (e) e.preventDefault();
    setMessage("");
    try {
      await api.patch(`/complaints/${id}/status`, { status, resolution_notes: notes });
      setMessage("Status updated successfully");
      load();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Update failed");
    }
  }

  if (!complaint) {
    return (
      <div className="max-w-7xl mx-auto py-24 text-center">
        {loadError ? (
          <div className="bg-white rounded-3xl border border-rose-100 p-10 max-w-md mx-auto">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-sm text-slate-800 font-extrabold mt-3">Unable to load complaint</p>
            <p className="text-xs text-slate-400 font-bold mt-1">{loadError}</p>
          </div>
        ) : (
          <>
            <div className="animate-spin h-8 w-8 border-2 border-emerald-800 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-slate-400 font-bold mt-3">Fetching grievance parameters...</p>
          </>
        )}
      </div>
    );
  }

  // Formatting date/time beautifully
  const formatFullDate = (dateString, dfl = "No date") => {
    if (!dateString) return dfl;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dfl;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " â€¢ " + d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: " 2-digit",
        hour12: true
      });
    } catch {
      return dfl;
    }
  };

  const getDayOnlyStr = (dateString, dfl = "NO DATE") => {
    if (!dateString) return dfl;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dfl;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
    } catch {
      return dfl;
    }
  };

  // Determine current progression index based on backend status
  const getStatusProgress = (s) => {
    const current = String(s || "").toLowerCase();
    if (current === "resolved") {
      return { index: 4, label: "Resolved" };
    }
    if (current === "in progress") {
      return { index: 3, label: "In Progress" };
    }
    if (current === "under review" || current === "review") {
      return { index: 2, label: "Under Review" };
    }
    return { index: 1, label: "Submitted" };
  };

  const statusProgress = getStatusProgress(complaint.status);
  const progressPercent = Math.round((statusProgress.index / 4) * 100);

  // Avatar Initials
  const getInitials = (name) => {
    if (!name) return "OC";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const listPath = user?.role === "admin"
    ? "/admin/complaints"
    : user?.role === "staff"
      ? "/staff/complaints"
      : "/student/complaints";

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* Header bar and Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <Link to={listPath} className="hover:text-emerald-800 transition-colors">
              Grievance Portal
            </Link>
            <span>/</span>
            <span className="text-slate-500">History</span>
          </div>
          <h2 className="text-slate-900 text-2xl font-black tracking-tight flex flex-wrap items-center gap-2">
            <span>#GRV-2026-{String(complaint.id).padStart(3, "0")}:</span>
            <span className="font-extrabold text-slate-700">{complaint.title}</span>
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-400" />
            Print PDF
          </button>
          <Link 
            to={listPath}
            className="inline-flex items-center gap-1.5 bg-[#043d2e] hover:bg-[#074737] text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Link>
        </div>
      </div>

      {/* Progress Milestone Header - Stitch Layout match */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-7 mb-8 relative overflow-hidden">
        <div className="relative py-4">
          {/* Connector horizontal line */}
          <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-slate-100 -translate-y-1/2" />
          
          <div className="relative flex justify-between">
            {[
              { idx: 1, label: "Submitted", statusText: "COMPLETED", date: getDayOnlyStr(complaint.created_at) },
              { idx: 2, label: "Under Review", statusText: "COMPLETED", date: getDayOnlyStr(complaint.updated_at) },
              { idx: 3, label: "In Progress", statusText: "IN PROGRESS", date: getDayOnlyStr(complaint.updated_at) },
              { idx: 4, label: "Resolved", statusText: "PENDING", date: "PENDING" }
            ].map((milestone) => {
              const isCompleted = statusProgress.index > milestone.idx || complaint.status === "Resolved";
              const isCurrent = statusProgress.index === milestone.idx && complaint.status !== "Resolved";
              
              return (
                <div key={milestone.idx} className="flex flex-col items-center z-10 text-center">
                  <div className={`
                    h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-all duration-300
                    ${isCompleted 
                      ? "bg-emerald-600 text-white" 
                      : isCurrent
                        ? "bg-emerald-950 text-white ring-4 ring-emerald-50"
                        : "bg-slate-100 border border-slate-200 text-slate-400"}
                  `}>
                    {isCompleted ? (
                      <Check className="h-5 w-5 stroke-[3]" />
                    ) : isCurrent ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </div>
                  
                  <span className={`
                    text-xs font-black tracking-tight mt-3
                    ${isCurrent ? "text-slate-900 font-black" : isCompleted ? "text-emerald-800 font-bold" : "text-slate-400"}
                  `}>
                    {milestone.label}
                  </span>

                  <span className={`
                    text-[9px] font-black uppercase tracking-wider mt-1 block
                    ${isCurrent ? "text-emerald-600" : isCompleted ? "text-emerald-600" : "text-slate-400"}
                  `}>
                    {isCurrent ? milestone.statusText : milestone.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side Pane (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-8 text-left">
          
          {/* Grievance Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 flex flex-col gap-6 shadow-2xs">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-800">
                <AlertCircle className="h-5 w-5 text-emerald-800 shrink-0" />
                <h3 className="font-extrabold text-lg tracking-tight">Grievance Information</h3>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-xl border
                ${complaint.priority === "High" ? "bg-rose-50 text-rose-800 border-rose-100" : "bg-amber-50 text-amber-800 border-amber-100"}
              `}>
                Priority: {complaint.priority}
              </span>
            </div>

            {/* Fields parameters details row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category</span>
                <span className="font-extrabold text-slate-800 text-[11px]">{complaint.category}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submitted On</span>
                <span className="font-extrabold text-slate-800 text-[11px]">
                  {formatFullDate(complaint.created_at)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned To</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-6 w-6 bg-emerald-800 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                    {getInitials(complaint.assignee?.name || "Unassigned")}
                  </div>
                  <span className="font-extrabold text-slate-800 text-[11px]">
                    {complaint.assignee?.name || "Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed description text */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detailed Description</h4>
              <div className="bg-slate-50/20 border border-slate-150 rounded-2xl p-5 text-slate-600 text-xs font-semibold leading-relaxed whitespace-pre-wrap min-h-[120px]">
                {complaint.description}
              </div>
            </div>
          </div>

          {/* Admin Status Panel ONLY for Staff/Admin Roles */}
          {(user?.role === "staff" || user?.role === "admin") && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col gap-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
                <UserCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <h3 className="font-extrabold text-lg tracking-tight text-white">Staff / Admin Controller Panel</h3>
              </div>

              <form onSubmit={updateStatus} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">Set Resolution Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    {["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map((item) => (
                      <option key={item} value={item} className="text-slate-900 font-semibold">{item}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-300">Resolution Operations Notes</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Enter permanent resolution summaries or feedback notes for files logs..."
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 min-h-[85px] resize-y"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
                  {message && (
                    <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {message}
                    </div>
                  )}
                  <button 
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-colors cursor-pointer ml-auto"
                  >
                    Save Operational State
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feedback details block (if resolved and feedback exists) */}
          {feedback && (
            <div className="bg-[#f0fdd4] border border-[#d9f99d] rounded-3xl p-6 sm:p-8 flex gap-4">
              <div className="h-10 w-10 bg-lime-200 text-lime-900 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-left">
                <h4 className="text-xs font-black text-lime-900 uppercase tracking-wider">Resolution Feedback From Student</h4>
                <p className="text-xs text-lime-800 font-bold">
                  Rating: <span className="font-extrabold underline">{feedback.rating}/5</span>
                </p>
                <p className="text-xs text-lime-700 leading-relaxed font-semibold mt-1">
                  &ldquo;{feedback.comment}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Administrative Communication Card - High Fidelity Thread */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xs overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <FileText className="h-5 w-5 text-emerald-800 shrink-0" />
              <h3 className="font-extrabold text-slate-800 text-base">Administrative Communication</h3>
            </div>

            <div className="p-6 sm:p-8 flex flex-col gap-6">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                <p className="text-xs font-extrabold text-slate-800">No communication records available</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Backend communication data is not available for this complaint.</p>
              </div>

            </div>
          </div>

        </div>

        {/* Right Side Sidebar Widgets (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-8 w-full text-left">
          
          {/* Evidence Attachments Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 pb-3 border-b border-slate-100">
              <Download className="h-4.5 w-4.5 text-emerald-800" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Evidence &amp; Attachments</span>
            </div>

            <div className="flex flex-col gap-2.5 mt-1">
              {attachments.length > 0 ? attachments.map((file, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 bg-white border border-slate-150 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                      <FileText className="h-4.5 w-4.5 text-emerald-800" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{file.size} &bull; {file.type}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="p-1 px-2.5 border border-slate-150 hover:border-emerald-600 bg-white hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-800 transition-all cursor-pointer"
                    title="Download Copy"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              )) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
                  <p className="text-xs font-extrabold text-slate-800">No attachments available</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">Backend attachment data is not available for this complaint.</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline and History Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 pb-4 border-b border-slate-100">
              <History className="h-4.5 w-4.5 text-emerald-800" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Timeline &amp; History</span>
            </div>

            <div className="relative pl-4 py-5 font-semibold">
              {/* Center vertical linking line */}
              <div className="absolute top-6 bottom-6 left-[19px] w-[1px] bg-slate-200" />

              <div className="flex flex-col gap-6">
                {[
                  {
                    status: complaint.status || "Submitted",
                    time: formatFullDate(complaint.updated_at),
                    desc: `Current status is ${complaint.status || "Submitted"}.`
                  },
                  {
                    status: "Submitted",
                    time: formatFullDate(complaint.created_at),
                    desc: "Complaint record created."
                  }
                ].map((log, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute left-[3px] top-1 h-1.5 w-1.5 rounded-full bg-emerald-700 ring-4 ring-emerald-50" />
                    
                    <span className="text-[9px] text-slate-400 font-black block mb-0.5">
                      {log.time}
                    </span>
                    <strong className="text-xs font-black text-slate-800 leading-tight block">
                      {log.status}
                    </strong>
                    <span className="text-[11px] text-slate-500 font-semibold leading-relaxed block mt-1">
                      {log.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resolution Info Box */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col gap-4 shadow-2xs">
            <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            
            <div className="text-left space-y-1">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Resolution Information</h4>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                Once all required actions are completed, the maintenance team will provide a resolution report. Final closure requires your confirmation of satisfaction.
              </p>
            </div>

            {/* Closure custom progression strip */}
            <div className="space-y-1 pt-2 border-t border-slate-100 text-left">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                <span>Progress to Closure</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

