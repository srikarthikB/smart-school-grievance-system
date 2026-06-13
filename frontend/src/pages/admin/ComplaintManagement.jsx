import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { 
  Search, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  Check, 
  AlertCircle, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  SlidersHorizontal,
  FileSpreadsheet,
  Paperclip
} from "lucide-react";

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const [drawerStatus, setDrawerStatus] = useState("Submitted");
  const [drawerStaffId, setDrawerStaffId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [exportNotification, setExportNotification] = useState("");

  // Helper date-format utilities
  function formatDateShort(dateString) {
    if (!dateString) return "No date";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "No date";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "No date";
    }
  }

  function formatFullDate(dateString) {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " + d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  }

  function load() {
    // Fetch complaints and users in parallel.
    // The backend /users endpoint lists all users; we filter to staff client-side.
    // If your backend exposes a dedicated /users/staff endpoint, use that instead.
    Promise.all([api.get("/complaints"), api.get("/users")])
      .then(([complaintsRes, usersRes]) => {
        setComplaints(complaintsRes.data || []);
        const allUsers = usersRes.data || [];
        // Support both { role: "staff" } and { role: "Staff" }
        setStaff(allUsers.filter((u) => String(u.role || "").toLowerCase() === "staff"));
        if (complaintsRes.data && complaintsRes.data.length > 0 && !selectedId) {
          setSelectedId(complaintsRes.data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load complaint management", err);
        setComplaints([]);
        setStaff([]);
        setErrorMessage(err.response?.data?.detail || "Could not load complaint management data.");
      });
  }

  useEffect(() => {
    load();
  }, []);

  const activeComplaint = useMemo(() => {
    if (!selectedId) return null;
    return complaints.find(c => c.id === selectedId) || null;
  }, [complaints, selectedId]);

  useEffect(() => {
    if (activeComplaint) {
      setDrawerStatus(activeComplaint.status || "Submitted");
      // Match staff by id (assigned_to) rather than name to avoid false mismatches
      setDrawerStaffId(activeComplaint.assigned_to ? String(activeComplaint.assigned_to) : "");
      setSuccessMessage("");
      setErrorMessage("");
    }
  }, [activeComplaint]);

  async function handleUpdateGrievanceState() {
    if (!activeComplaint) return;
    setSuccessMessage("");
    setErrorMessage("");
    try {
      if (drawerStaffId) {
        await api.patch(`/complaints/${activeComplaint.id}/assign`, { 
          staff_id: Number(drawerStaffId) 
        });
      } else if (activeComplaint.assigned_to) {
        setErrorMessage("Unassigning a staff member is not supported. Select a different staff member to reassign.");
        return;
      }

      await api.patch(`/complaints/${activeComplaint.id}/status`, { 
        status: drawerStatus 
      });

      setSuccessMessage("State updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      load();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to update state");
    }
  }

  async function handlePriorityChange(cid, val) {
    try {
      await api.patch(`/complaints/${cid}`, { priority: val });
      load();
    } catch (err) {
      setErrorMessage("Error updating priority");
    }
  }

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const cidStr = `#grv-${c.id}`;
        const matchTitle = (c.title || "").toLowerCase().includes(query);
        const matchCreator = (c.creator?.name || "").toLowerCase().includes(query);
        const matchCategory = (c.category || "").toLowerCase().includes(query);
        const matchId = String(c.id).includes(query) || cidStr.includes(query);
        if (!matchTitle && !matchCreator && !matchCategory && !matchId) return false;
      }

      if (categoryFilter !== "All" && c.category !== categoryFilter) return false;
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (priorityFilter !== "All" && c.priority !== priorityFilter) return false;

      if (dateFilter) {
        const formDate = formatDateShort(c.created_at).toLowerCase();
        const inputDate = new Date(dateFilter).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
        if (!formDate.includes(inputDate)) return false;
      }

      return true;
    });
  }, [complaints, searchQuery, categoryFilter, statusFilter, priorityFilter, dateFilter]);

  const handleExportCSV = () => {
    const headers = "CaseID,Student,Category,Priority,Status,Assignee,Date\n";
    const rows = filteredComplaints.map(c => 
      `#GRV-${c.id},"${c.creator?.name || "Anonymous"}","${c.category}","${c.priority}","${c.status}","${c.assignee?.name || "Unassigned"}",${formatDateShort(c.created_at)}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `grievance-report-${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
    
    setExportNotification("Report exported and downloaded successfully!");
    setTimeout(() => setExportNotification(""), 4000);
  };

  const activeTimeline = useMemo(() => {
    if (!activeComplaint) return [];
    return [
      {
        title: activeComplaint.status || "Status Tracked",
        time: formatFullDate(activeComplaint.updated_at),
        desc: activeComplaint.resolution_notes || `Current status: ${activeComplaint.status || "Submitted"}.`,
        active: true
      },
      {
        title: "Grievance Created",
        time: formatFullDate(activeComplaint.created_at),
        desc: `Submitted by ${activeComplaint.creator?.name || "Student User"}.`,
        active: false
      }
    ];
  }, [activeComplaint]);

  const uniqueCategories = [
    "All", "Academic", "Faculty", "Student", "Infrastructure", "Transport", "Administration", "Other"
  ];

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-[#0c3127] text-2xl sm:text-3xl font-black tracking-tight">Grievance Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
            Review and manage student submissions across all departments.
          </p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl py-2 px-4 shadow-3xs">
          <span className="text-xs font-bold text-emerald-800">
            Active Cases: <strong className="text-slate-900 font-black">{filteredComplaints.length}</strong>
          </span>
        </div>
      </div>

      {/* Global error banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-800 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Case ID, student name, description..."
          className="w-full bg-white border border-slate-200/90 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-2xs"
        />
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        <div className={selectedId ? "xl:col-span-8 space-y-6" : "xl:col-span-12 space-y-6"}>
          
          {/* Filters card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <SlidersHorizontal className="h-4 w-4 text-emerald-800" />
                <span>Filters & Controls</span>
              </div>
              <button 
                onClick={() => {
                  setCategoryFilter("All");
                  setStatusFilter("All");
                  setPriorityFilter("All");
                  setDateFilter("");
                  setSearchQuery("");
                }}
                className="text-[10px] uppercase font-black text-slate-400 hover:text-emerald-800 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  {["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Priority</label>
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="All">All Priorities</option>
                  {["Low", "Medium", "High"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date Range</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input 
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
              {exportNotification ? (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  {exportNotification}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-bold">
                  Showing <strong className="text-slate-700 font-extrabold">{filteredComplaints.length}</strong> of {complaints.length} results
                </span>
              )}

              <button 
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl h-9 cursor-pointer transition-all shadow-3xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-5 py-4">Case ID</th>
                    <th className="px-5 py-4">Student Name</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Assigned To</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-xs text-slate-400 font-semibold">
                        No complaints match your current filters.
                      </td>
                    </tr>
                  ) : filteredComplaints.map((c) => {
                    const isSelected = selectedId === c.id;

                    let priorityBadge = "bg-emerald-50 text-emerald-800 border-emerald-100";
                    if (c.priority === "High") {
                      priorityBadge = "bg-rose-50 text-rose-800 border-rose-150 font-black uppercase";
                    } else if (c.priority === "Medium") {
                      priorityBadge = "bg-amber-50 text-amber-800 border-amber-150 font-black uppercase";
                    }

                    // Fixed: removed duplicate "In Progress" case; each status has one style
                    let statusBadge = "bg-slate-100 text-slate-700 border-slate-200";
                    if (c.status === "In Progress") {
                      statusBadge = "bg-red-50 text-red-800 border-red-150 font-black";
                    } else if (c.status === "Under Review") {
                      statusBadge = "bg-indigo-50 text-indigo-800 border-indigo-150 font-black";
                    } else if (c.status === "Resolved") {
                      statusBadge = "bg-[#064e3b] text-emerald-100 border-transparent font-black";
                    } else if (c.status === "Rejected") {
                      statusBadge = "bg-slate-200 text-slate-700 border-slate-300 font-black";
                    }

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => setSelectedId(c.id)}
                        className={`transition-all cursor-pointer hover:bg-slate-50/40 
                          ${isSelected ? "bg-emerald-50/30 font-semibold border-l-4 border-l-emerald-800" : ""}
                        `}
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-black text-slate-800">#GRV-{c.id}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs text-slate-800 font-extrabold">{c.creator?.name || "Anonymous"}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs text-slate-500 font-semibold">{c.category || "Academic"}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[9px] tracking-wider px-2 py-0.5 rounded-lg border ${priorityBadge}`}>
                            {c.priority || "Low"}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[9px] tracking-wider px-2.5 py-0.5 rounded-full border uppercase ${statusBadge}`}>
                            {c.status || "Submitted"}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                          {c.assignee?.name || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400 font-bold">
                          {formatDateShort(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Showing {Math.min(filteredComplaints.length, 10)} of {filteredComplaints.length} results</span>
              <div className="flex items-center gap-1.5">
                <button className="p-1 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="p-1 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right drawer */}
        {selectedId && activeComplaint && (
          <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-lg flex flex-col overflow-hidden sticky top-24">
            
            <div className="bg-[#0c3127] text-white p-5 flex items-center justify-between relative">
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider block">Case #GRV-{activeComplaint.id}</span>
                <h3 className="font-extrabold text-white text-lg tracking-tight leading-tight">
                  {activeComplaint.creator?.name || "Anonymous Student"}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedId(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white transition-all cursor-pointer focus:outline-none"
                title="Close Side Drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 text-left max-h-[75vh]">
              
              {/* Status + Assign dropdowns */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Status</label>
                  <select 
                    value={drawerStatus} 
                    onChange={(e) => setDrawerStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
                  >
                    {["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Assign Staff</label>
                  <select 
                    value={drawerStaffId} 
                    onChange={(e) => setDrawerStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {staff.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action feedback */}
              <div className="space-y-2.5">
                {successMessage && (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage}
                  </p>
                )}
                {errorMessage && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {errorMessage}
                  </p>
                )}
                
                <button 
                  onClick={handleUpdateGrievanceState}
                  className="w-full bg-[#0c3127] hover:bg-[#0f4033] text-white text-xs font-black py-3 rounded-xl tracking-wide uppercase cursor-pointer shadow-xs active:scale-98 transition-all"
                >
                  Update Grievance State
                </button>
              </div>

              {/* Complaint details */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Complaint Details</span>
                
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold block">Category:</span>
                    <strong className="text-slate-800 font-extrabold block">{activeComplaint.category}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold block">Submission Date:</span>
                    <strong className="text-slate-800 font-extrabold block">{formatFullDate(activeComplaint.created_at)}</strong>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-slate-400 font-semibold block">Priority Rank:</span>
                    <strong className="text-rose-600 font-black tracking-wide block uppercase">{activeComplaint.priority}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] font-extrabold text-slate-700 block">Subject Title:</span>
                  <p className="text-xs text-slate-800 font-bold bg-slate-50 border border-slate-150 p-2.5 rounded-xl">{activeComplaint.title}</p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs text-slate-600 font-semibold leading-relaxed italic whitespace-pre-wrap">
                  &ldquo;{activeComplaint.description}&rdquo;
                </div>

                {/* Attachment placeholder — no alerts, clearly communicates status */}
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
                  <Paperclip className="h-4 w-4 text-slate-300 shrink-0" />
                  <span className="text-xs text-slate-400 font-semibold italic">Attachment support is planned for a future release.</span>
                </div>
              </div>

              {/* Action timeline */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Action Timeline</span>

                <div className="relative pl-3.5 font-semibold space-y-5">
                  <div className="absolute top-2.5 bottom-2.5 left-[19.5px] w-[1px] bg-slate-200" />

                  {activeTimeline.map((item, idx) => (
                    <div key={idx} className="relative pl-5 text-xs">
                      <div className={`absolute top-1 left-[-1.5px] h-2 w-2 rounded-full ring-4 ring-emerald-50 
                        ${item.active ? "bg-emerald-800" : "bg-slate-400"}`} 
                      />
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">{item.time}</span>
                        <h4 className="font-extrabold text-[#0c3127]">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer actions */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                <Link 
                  to={`/complaints/${activeComplaint.id}`}
                  className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Record
                </Link>
                <Link 
                  to={`/complaints/${activeComplaint.id}`}
                  className="py-2.5 bg-[#0c3127] hover:bg-[#0f4033] text-white text-xs font-black text-center rounded-xl tracking-wide uppercase cursor-pointer transition-colors flex items-center justify-center"
                >
                  Open Case
                </Link>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}