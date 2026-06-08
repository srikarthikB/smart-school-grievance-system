import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  X, 
  User, 
  Layers, 
  Paperclip, 
  ChevronRight, 
  Clock, 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  History, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  Send,
  Download,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Info
} from "lucide-react";

export default function StaffComplaints() {
  const { user } = useAuth();
  
  // Real complaints fetched from backend
  const [assignedComplaints, setAssignedComplaints] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Active selected complaint for the Right Detail panel
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // State for interactive features
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Submitted, Review, Action, Resolved
  const [remarksMap, setRemarksMap] = useState({});
  const [newRemarkText, setNewRemarkText] = useState("");
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [statusDraft, setStatusDraft] = useState("Under Review");
  const [resolutionNotesDraft, setResolutionNotesDraft] = useState("");

  // Load complaints and stats from the localStorage/mock database
  const loadData = async () => {
    try {
      setLoading(true);
      const resAssigned = await api.get("/complaints/assigned");
      const resAll = await api.get("/complaints");
      
      const assigned = resAssigned.data || [];
      const all = resAll.data || [];
      
      setAssignedComplaints(assigned);
      setAllComplaints(all);

      // Auto-select first assigned complaint on mount if available, or first general complaint
      if (assigned.length > 0) {
        setSelectedComplaint(assigned[0]);
      } else if (all.length > 0) {
        setSelectedComplaint(all[0]);
      }
    } catch (err) {
      console.error("Failed to load staff complaints", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Load local remarks database from storage to keep remarks active and persistent
    const storedRemarks = localStorage.getItem("staff_remarks_history");
    if (storedRemarks) {
      try {
        setRemarksMap(JSON.parse(storedRemarks));
      } catch (e) {
        console.error("Error loading staff remarks", e);
      }
    }
  }, []);

  // Sync draft states when chosen complaint switches
  useEffect(() => {
    if (selectedComplaint) {
      setStatusDraft(selectedComplaint.status || "Under Review");
      setResolutionNotesDraft(selectedComplaint.resolution_notes || "");
      setShowRemarkInput(false);
      setShowStatusPopover(false);
      setActionSuccessMessage("");
    }
  }, [selectedComplaint]);

  // Handle Search & Filter logic
  const filteredComplaints = useMemo(() => {
    // Determine list to filter:
    // If we're showing "Assigned", list assigned. But let's let staff see all complaints if assigned list is too small!
    const targetSource = assignedComplaints.length > 0 ? assignedComplaints : allComplaints;

    return targetSource.filter((c) => {
      // 1. Search term (by creator name, title, or category)
      const keyword = searchTerm.toLowerCase().trim();
      const creatorName = (c.creator?.name || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const category = (c.category || "").toLowerCase();
      const matchesSearch = !keyword || 
        creatorName.includes(keyword) || 
        title.includes(keyword) || 
        category.includes(keyword) || 
        `grv-${c.id}`.includes(keyword);

      // 2. Status match
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
  }, [assignedComplaints, allComplaints, searchTerm, statusFilter]);

  // Add a persistent remark
  const handleAddRemark = (e) => {
    if (e) e.preventDefault();
    if (!newRemarkText.trim() || !selectedComplaint) return;

    const complaintId = selectedComplaint.id;
    const currentRemarks = remarksMap[complaintId] || [];
    const newRemark = {
      id: "rem-" + Date.now(),
      author: user?.name || "Unassigned",
      text: newRemarkText.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " â€¢ Today"
    };

    const updatedRemarks = [...currentRemarks, newRemark];
    const newRemarksMap = {
      ...remarksMap,
      [complaintId]: updatedRemarks
    };

    setRemarksMap(newRemarksMap);
    localStorage.setItem("staff_remarks_history", JSON.stringify(newRemarksMap));
    setNewRemarkText("");
    setShowRemarkInput(false);
    setActionSuccessMessage("Remark added securely.");
    setTimeout(() => setActionSuccessMessage(""), 4000);
  };

  // Escalate case to High priority
  const handleEscalateCase = async () => {
    if (!selectedComplaint) return;
    try {
      await api.patch(`/complaints/${selectedComplaint.id}`, { priority: "High" });
      setActionSuccessMessage("Case successfully escalated to High priority.");
      setTimeout(() => setActionSuccessMessage(""), 4000);
      loadData();
    } catch (err) {
      console.error("Escalation failed", err);
    }
  };

  // Update Status & resolution logs
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
      
      // Reload lists and refresh currently selected instance
      const resAll = await api.get("/complaints");
      const resAssigned = await api.get("/complaints/assigned");
      setAllComplaints(resAll.data || []);
      setAssignedComplaints(resAssigned.data || []);
      
      // Update selected reference local parameter
      const freshInstance = (resAll.data || []).find(c => c.id === selectedComplaint.id);
      if (freshInstance) {
        setSelectedComplaint(freshInstance);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Helper mapping for display tags
  const getPriorityTag = (p) => {
    const priority = String(p || "").toUpperCase();
    if (priority === "HIGH") {
      return { label: "High", style: "bg-rose-50 text-rose-700 border-rose-150 border font-extrabold" };
    }
    if (priority === "MEDIUM") {
      return { label: "HIGH", style: "bg-amber-50 text-amber-700 border-amber-150 border font-extrabold" };
    }
    return { label: "Standard", style: "bg-slate-100 text-slate-600 border-slate-200 border font-bold" };
  };

  const getStatusBadgeStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "resolved") {
      return "bg-[#f0fdf4] text-emerald-800 border border-emerald-100";
    }
    if (s === "In Progress") {
      return "bg-rose-50 text-rose-800 border border-rose-150";
    }
    if (s === "under review" || s === "in progress" || s === "review") {
      return "bg-amber-50 text-amber-850 border border-amber-150";
    }
    return "bg-slate-50 text-slate-600 border border-slate-200";
  };

  // Safe formatting date/time 
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

  return (
    <div className="font-sans text-left pb-12 space-y-6">
      
      {/* Dynamic Top bar header matches Stitch Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#0c3127] tracking-tight">Grievance Portal</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">Campus integrity and impartial inquiry console</p>
        </div>

        {/* Global actions row */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-400 hover:text-[#0c3127] hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full" />
          </button>
          
          <button 
            type="button"
            onClick={() => alert("Loading institutional resolve FAQs and resource handbook parameters...")}
            className="p-2 text-slate-400 hover:text-[#0c3127] hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <div className="h-6 w-[1px] bg-slate-200" />

          {/* Connected User Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-black text-slate-800 block">{user?.name || "Unassigned"}</span>
              <span className="text-[10px] text-emerald-800 font-extrabold uppercase block tracking-wider mt-0.5">Staff Officer</span>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop" 
              className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-100"
              alt="Staff Avatar"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Action Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl text-xs font-bold text-[#0c3127] flex items-center gap-2.5 shadow-3xs animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Stats Counter Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Assigned */}
        <div className="bg-white rounded-3xl border border-slate-205 border-slate-200/90 p-6 flex items-center justify-between shadow-3xs">
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-bold text-slate-500 block">Assigned</span>
            <span className="text-3xl font-black text-slate-800 block">
              {assignedComplaints.length}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100/40">
            <ClipboardCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2: Submitted Review */}
        <div className="bg-white rounded-3xl border border-slate-205 border-slate-200/90 p-6 flex items-center justify-between shadow-3xs">
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-bold text-slate-500 block">Submitted Review</span>
            <span className="text-3xl font-black text-slate-800 block">
              {allComplaints.filter(c => c.status !== "Resolved" && c.status !== "Rejected").length}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100/50">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3: Resolved */}
        <div className="bg-white rounded-3xl border border-slate-205 border-slate-200/90 p-6 flex items-center justify-between shadow-3xs">
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-bold text-slate-500 block">Resolved (Monthly)</span>
            <span className="text-3xl font-black text-slate-800 block">
              {allComplaints.filter(c => c.status === "Resolved").length}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#ecfdf5] text-emerald-700 flex items-center justify-center border border-emerald-100/55">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Main interactive workflow area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column Panel: Complaint selection list (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* List Search and Quick Filters card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4.5 p-5 shadow-3xs flex flex-col gap-4">
            
            {/* Search Input Box */}
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

            {/* Pill Filters row matches screenshot buttons precisely */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {["All", "Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map((pill) => {
                const isActive = statusFilter === pill;
                return (
                  <button
                    key={pill}
                    onClick={() => setStatusFilter(pill)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? "bg-[#0c3127] text-white shadow-3xs hover:bg-[#0f4033]" 
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>

          </div>

          {/* List display */}
          {loading ? (
            <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center">
              <div className="h-8 w-8 animate-spin border-2 border-emerald-800 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-slate-400 font-bold mt-3">Refreshing grievances database...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 flex flex-col items-center justify-center gap-4">
              <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">No complaints match filters</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">Try relaxing filters or search parameters.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredComplaints.map((c) => {
                const isSelected = selectedComplaint && selectedComplaint.id === c.id;
                const tag = getPriorityTag(c.priority);
                
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-6 rounded-3xl border text-left cursor-pointer transition-all duration-200 flex flex-col gap-4 relative group hover:shadow-xs
                      ${isSelected 
                        ? "bg-white border-emerald-800/80 shadow-2xs ring-2 ring-emerald-500/10 border-l-[6px] border-l-[#0c3127]" 
                        : "bg-white border-slate-200/95 hover:border-slate-350/80"
                      }
                    `}
                  >
                    
                    {/* Top Row: Tags & Timing */}
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${tag.style}`}>
                        {tag.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {displayTime(c.created_at)}
                      </span>
                    </div>

                    {/* Complaint Main Title */}
                    <h3 className="text-slate-900 font-extrabold text-[15px] leading-tight group-hover:text-[#0c3127] transition-colors">
                      {c.title}
                    </h3>

                    {/* Student details and category metrics row */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-slate-500 font-semibold border-t border-slate-50 pt-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.creator?.name || "Student Demographics"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.category || "General Department"}</span>
                      </span>
                    </div>

                    {/* Bottom Status Row & CTA Trigger */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl ${getStatusBadgeStyle(c.status)}`}>
                        {c.status || "Submitted"}
                      </span>

                      <span className="inline-flex items-center gap-1 text-emerald-800 text-[11px] font-extrabold hover:underline">
                        <span>View Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Column Panel: Interactive Case Detail Panel (5 cols) */}
        <div className="lg:col-span-5">
          {selectedComplaint ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col gap-6 shadow-3xs text-left relative">
              
              {/* Card Header title with Close (X) */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <h2 className="text-slate-950 font-black text-base tracking-tight truncate">
                  Case Detail: #GRV-{selectedComplaint.id}
                </h2>
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                  title="Close panel"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Student identity row profile cards element */}
              <div className="flex items-center gap-3.5 bg-slate-50/60 border border-slate-150 rounded-2.5xl p-4 rounded-2xl">
                <div className="h-11 w-11 rounded-xl bg-[#0c3127] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {selectedComplaint.creator?.name ? selectedComplaint.creator.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 block truncate">{selectedComplaint.creator?.name || "Student G."}</h4>
                  <p className="text-[10px] text-slate-400 font-extrabold block truncate mt-0.5 uppercase tracking-wide">
                    Case ID: {String(selectedComplaint.id).padStart(4, "0")} â€¢ Year 3
                  </p>
                </div>
              </div>

              {/* Complaint Description paragraph section with layout quotation marks */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">
                  COMPLAINT DESCRIPTION
                </span>
                <div className="text-slate-600 text-xs font-semibold leading-relaxed relative py-1">
                  <span className="text-slate-300 font-serif text-3xl select-none absolute -left-1 -top-3 block">â€œ</span>
                  <div className="pl-4 italic whitespace-pre-wrap">{selectedComplaint.description}</div>
                </div>
              </div>

              {/* Attached Evidence files section */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">
                  ATTACHED EVIDENCE
                </span>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4.5 w-4.5 text-emerald-800 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[11px] font-extrabold text-slate-700 truncate">marked_evidence_proof.jpg</p>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mt-0.5">Image &bull; 1.8 MB</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert("Downloading evidence attachment binary files from school archive...")}
                      className="p-1 px-2.5 bg-white border border-slate-200 hover:border-[#0c3127] rounded-lg text-slate-400 hover:text-[#0c3127] cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4.5 w-4.5 text-emerald-800 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[11px] font-extrabold text-slate-700 truncate">formal_grades_transcript.pdf</p>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mt-0.5">PDF Document &bull; 450 KB</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert("Downloading evidence attachment binary files from school archive...")}
                      className="p-1 px-2.5 bg-white border border-slate-200 hover:border-[#0c3127] rounded-lg text-slate-400 hover:text-[#0c3127] cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Timeline section matches Stitch design */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">
                  COMPLAINT TIMELINE
                </span>
                
                <div className="relative pl-3 font-semibold space-y-4">
                  {/* Vertical background connector line */}
                  <div className="absolute top-1.5 bottom-1.5 left-[15px] w-[1px] bg-slate-200" />

                  <div className="relative pl-5 flex items-start gap-2">
                    <div className="absolute left-[0.2px] top-1.5 h-2 w-2 rounded-full bg-emerald-800 ring-4 ring-emerald-50" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">No date</span>
                      <strong className="text-[11px] text-slate-800 block">Case selected for review</strong>
                    </div>
                  </div>

                  <div className="relative pl-5 flex items-start gap-2">
                    <div className="absolute left-[0.2px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">{displayTime(selectedComplaint.created_at)}</span>
                      <strong className="text-[11px] text-slate-500 block">Complaint Submitted &amp; Verified</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Remarks Section */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5 border-b border-slate-50">
                  STAFF REMARKS HISTORY
                </span>

                {/* List added remarks */}
                {(!remarksMap[selectedComplaint.id] || remarksMap[selectedComplaint.id].length === 0) ? (
                  <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                    <span className="text-[11px] text-slate-400 italic font-semibold">No remarks added yet.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                    {remarksMap[selectedComplaint.id].map((rem) => (
                      <div key={rem.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span className="text-slate-700 font-black">{rem.author}</span>
                          <span>{rem.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{rem.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Remark form trigger */}
                {showRemarkInput ? (
                  <form onSubmit={handleAddRemark} className="flex gap-2 pt-1 animate-fade-in">
                    <input 
                      type="text"
                      required
                      value={newRemarkText}
                      onChange={(e) => setNewRemarkText(e.target.value)}
                      placeholder="Type a new remark to save forever..."
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-800"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2.5 bg-[#0c3127] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#0f4033]"
                    >
                      Save
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowRemarkInput(false)}
                      className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : null}
              </div>

              {/* Status Update / Action Drawer/Form */}
              {showStatusPopover ? (
                <div className="bg-[#092921]/10 rounded-2.5xl p-5 border border-emerald-800/10 rounded-2xl bg-slate-50 text-slate-900 gap-4 flex flex-col pt-4 mt-2">
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <History className="h-4 w-4 text-emerald-800" />
                      Set Case Resolution parameters
                    </span>
                    <button onClick={() => setShowStatusPopover(false)} className="text-slate-400 hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
                    
                    {/* Status option selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Set Resolution Status</label>
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

                    {/* Operational summary memo logs */}
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Permanent Resolution Summary Notes</label>
                      <textarea
                        value={resolutionNotesDraft}
                        onChange={(e) => setResolutionNotesDraft(e.target.value)}
                        placeholder="Provide details about actions or instructions for historical logs..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] min-h-[85px] resize-y"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#0c3127] hover:bg-[#0f4033] py-3 tracking-wider font-black text-xs text-white rounded-xl uppercase shadow-sm active:scale-98 transition-all cursor-pointer"
                    >
                      Confirm Operational Update
                    </button>

                  </form>
                </div>
              ) : null}

              {/* Administrative controller workflow dual action keys */}
              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-100 pt-5">
                <button 
                  onClick={() => setShowRemarkInput(true)}
                  className="inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:border-emerald-600 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  <Plus className="h-4 w-4" />
                  Add Remark
                </button>

                <button 
                  onClick={handleEscalateCase}
                  className="inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50/45 text-slate-700 hover:text-rose-900 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Escalate
                </button>
              </div>

              {/* Big primary CTA resolution selector toggle button */}
              <button 
                type="button"
                onClick={() => setShowStatusPopover(true)}
                className="w-full bg-[#0c3127] hover:bg-[#0f4033] text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-98 transition-all mt-1"
              >
                <span>Update Status / Mark Resolved</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 p-16 rounded-3xl text-center shadow-3xs flex flex-col items-center justify-center gap-4.5 min-h-[400px]">
              <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">No complaint selected</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">Select any case from the list to preview details and execute resolution operations.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Institutional administrative transparency guideline box at bottom */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-start gap-3.5 text-left pt-4">
        <div className="p-1.5 rounded-xl bg-emerald-100 text-[#0c3127] shrink-0">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div>
          <strong className="text-[10px] font-black uppercase text-[#0c3127] tracking-wider block">
            Resolution SLA Notice
          </strong>
          <p className="text-[11px] text-emerald-990 text-emerald-900 font-medium leading-relaxed mt-0.5">
            Staff members are required to submit investigative remarks within 24 working hours. Ensure student anonymity is strictly respected if indicated on the report guidelines.
          </p>
        </div>
      </div>

    </div>
  );
}


