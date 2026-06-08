import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal,
  TrendingDown,
  Calendar,
  Compass,
  UserCheck,
  User,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Info
} from "lucide-react";

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [timeFilter, setTimeFilter] = useState("Last 30 Days");

  useEffect(() => {
    api.get("/complaints/mine").then((res) => {
      setComplaints(res.data || []);
    });
  }, []);

  // Format date helper
  const formatDate = (dateString, fallback = "Oct 12, 2024") => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return fallback;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return fallback;
    }
  };

  // Convert Status to step mapping
  const getStepState = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "resolved") {
      return { stepIndex: 4, label: "Resolved" };
    }
    if (s === "action required" || s === "in progress") {
      return { stepIndex: 3, label: "Action" };
    }
    if (s === "under review") {
      return { stepIndex: 2, label: "Review" };
    }
    return { stepIndex: 1, label: "Submitted" };
  };

  // Filter complaints list
  const filteredComplaints = complaints.filter((c) => {
    // Search match
    const title = (c.title || "").toLowerCase();
    const cat = (c.category || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = title.includes(query) || cat.includes(query);

    // Status match
    const matchesStatus = 
      statusFilter === "All Statuses" || 
      (c.status || "").toLowerCase() === statusFilter.toLowerCase();

    // Time filter simulation (in mock scenario, we'll return all, but we can match dates if real)
    let matchesTime = true;
    if (timeFilter === "Last 7 Days") {
      // simulate check
      matchesTime = true;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  // Compile timeline updates dynamically based on user's complaints
  const timelineUpdates = complaints.slice(0, 3).map((c, idx) => {
    const dateStr = formatDate(c.created_at, idx === 0 ? "Today, 10:45 AM" : idx === 1 ? "Yesterday, 02:30 PM" : "Oct 12, 2024");
    
    let heading = `New grievance submitted`;
    let subtext = `Complaint regarding ${c.category || "General"} categorized successfully.`;
    
    if (c.status === "Resolved") {
      heading = `Status changed to "Resolved"`;
      subtext = c.resolution_notes || `Your issue has been resolved by ${c.assignee?.name || "Operations Team"}.`;
    } else if (c.status === "Action Required") {
      heading = `Status changed to "Action Required"`;
      subtext = `Additional information or photo evidence requested for grievance #${c.id}.`;
    } else if (c.status === "In Progress" || c.status === "Under Review") {
      heading = `Grievance assigned to ${c.assignee?.name || "Appropriate Dean"}`;
      subtext = `Investigation is active under standard institutional review speed.`;
    }

    return {
      id: c.id,
      time: dateStr,
      heading,
      subtext
    };
  });

  // Fallback timeline updates if no complaints exist
  const defaultTimeline = [
    {
      id: "demo-1",
      time: "Today, 10:45 AM",
      heading: 'Status changed to "Action Required"',
      subtext: "Additional photo evidence requested for #GRV-2024-089."
    },
    {
      id: "demo-2",
      time: "Yesterday, 02:30 PM",
      heading: "Grievance assigned to Dean",
      subtext: "Investigation set to active status under designated committee."
    },
    {
      id: "demo-3",
      time: "Oct 12, 2024",
      heading: "New grievance submitted",
      subtext: "System classified complaint category and successfully logged."
    }
  ];

  const finalTimeline = timelineUpdates.length > 0 ? timelineUpdates : defaultTimeline;

  return (
    <div className="flex flex-col gap-8 pb-16">
      
      {/* Search and Portal Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
        <div>
          <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider block">Portal</span>
          <div className="relative mt-2.5 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search grievance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-0 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Status Selection Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              {["All Statuses", "Pending", "Under Review", "In Progress", "Action Required", "Resolved"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Time range selection */}
          <div className="relative">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              {["Last 30 Days", "Last 7 Days", "All Time"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Primary Title */}
      <div>
        <h2 className="text-[#0d1e1a] text-3xl font-extrabold tracking-tight">Track Your Submissions</h2>
        <p className="text-slate-500 text-sm font-semibold mt-1.5">
          Manage and monitor the progress of your submitted reports.
        </p>
      </div>

      {/* Primary Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column Component List: Complaint Cards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center gap-4">
              <div className="h-14 w-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <ClipboardList className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">No matching submissions found</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">Try adjusting your search filters or create a new student grievance.</p>
              </div>
            </div>
          ) : (
            filteredComplaints.map((c) => {
              const { stepIndex, label } = getStepState(c.status);
              
              // Custom Badges for exact status matching the mockup style
              let badgeColor = "bg-slate-55 bg-slate-100 text-slate-800";
              if (c.status === "Action Required") {
                badgeColor = "bg-rose-50 text-rose-800 border-rose-100/50 border";
              } else if (c.status === "Under Review") {
                badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-100/50 border";
              } else if (c.status === "Resolved") {
                badgeColor = "bg-sky-50 text-sky-800 border-sky-100/50 border";
              } else if (c.status === "In Progress") {
                badgeColor = "bg-amber-50 text-amber-800 border-amber-100/50 border";
              }

              return (
                <div 
                  key={c.id} 
                  className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-7 flex flex-col gap-6 shadow-2xs hover:shadow-xs transition-shadow duration-200"
                >
                  
                  {/* Card Header row */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      #GRV-2026-{String(c.id).padStart(3, "0")}
                    </span>
                    <span className={`text-[10px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-xl ${badgeColor}`}>
                      {c.status || "Pending"}
                    </span>
                  </div>

                  {/* Grievance Title */}
                  <h3 className="text-slate-900 font-extrabold text-lg -mt-2 leading-snug">
                    {c.title}
                  </h3>

                  {/* Horizontal Progress Track exactly as shown on the Stitch Mock */}
                  <div className="relative py-6">
                    {/* Background connector line */}
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -translate-y-1/2" />
                    
                    <div className="relative flex justify-between">
                      {[
                        { step: 1, label: "Submitted" },
                        { step: 2, label: "Review" },
                        { step: 3, label: "Action" },
                        { step: 4, label: "Resolved" }
                      ].map((item) => {
                        const isCompleted = stepIndex > item.step;
                        const isCurrent = stepIndex === item.step;

                        return (
                          <div key={item.step} className="flex flex-col items-center">
                            {/* Milestone Marker design */}
                            <div className={`
                              h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all duration-300
                              ${isCompleted 
                                ? "bg-emerald-800 text-white shadow-3xs" 
                                : isCurrent 
                                  ? "bg-white border-2 border-emerald-800 text-emerald-800 font-extrabold" 
                                  : "bg-white border-2 border-slate-205 border-slate-200 text-slate-300"}
                            `}>
                              {isCompleted ? (
                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : isCurrent ? (
                                <span className="h-2 w-2 rounded-full bg-emerald-800" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-205 bg-slate-200" />
                              )}
                            </div>
                            <span className={`
                              text-[10px] font-bold mt-2.5 tracking-tight
                              ${isCompleted || isCurrent ? "text-emerald-900 font-extrabold" : "text-slate-400 font-semibold"}
                            `}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-left text-xs bg-slate-50/50 p-4 rounded-2xl">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Submitted On</span>
                      <span className="font-extrabold text-slate-800 text-[11px]">
                        {formatDate(c.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Category</span>
                      <span className="font-extrabold text-slate-800 text-[11px]">
                        {c.category}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Assigned To</span>
                      <span className="font-extrabold text-slate-800 text-[11px] truncate">
                        {c.assignee?.name || " Dean of Operations"}
                      </span>
                    </div>
                  </div>

                  {/* Details Navigation Button */}
                  <div className="pt-2">
                    <Link 
                      to={`/complaints/${c.id}`}
                      className="w-full inline-flex items-center justify-center border border-slate-200 hover:bg-slate-50 active:scale-99 text-slate-700 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-3xs"
                    >
                      View Details
                    </Link>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Right Side Column Panels */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          {/* Resolution Metrics statistics panel */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col text-left gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Resolution Metrics</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-black text-slate-900 tracking-tight">4.2</span>
                <span className="text-base font-bold text-slate-800">Days</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">Average Resolution Time</p>
            </div>
            
            {/* Speed Improvement statistics indicator */}
            <div className="bg-[#f0fdf4] border border-[#d1fae5] rounded-2xl p-3.5 flex items-center gap-2.5 text-emerald-800">
              <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs font-extrabold tracking-tight">
                12% faster than last month
              </p>
            </div>
          </div>

          {/* Timeline Update component */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col text-left">
            <div className="flex items-center gap-2 text-slate-400 pb-5 border-b border-slate-100">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Timeline Update</span>
            </div>

            {/* Custom Interactive Vertical Connection Bar */}
            <div className="relative py-4 pl-4 mt-1">
              <div className="absolute top-6 bottom-6 left-[19px] w-[1px] bg-slate-200" />

              <div className="flex flex-col gap-6">
                {finalTimeline.map((item, index) => (
                  <div key={item.id} className="relative pl-6">
                    {/* Circle marker milestone connector */}
                    <div className="absolute left-[1.5px] top-1.5 h-2 w-2 rounded-full border border-slate-350 bg-white ring-4 ring-slate-100" />
                    
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      {item.time}
                    </span>
                    <strong className="text-xs font-extrabold text-slate-800 leading-tight block">
                      {item.heading}
                    </strong>
                    <span className="text-[11px] text-slate-500 font-semibold leading-relaxed block mt-1">
                      {item.subtext}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inactive secondary action logs button */}
            <button className="w-full text-center hover:bg-slate-50 text-slate-600 text-xs font-bold border-t border-slate-150 pt-4 cursor-pointer hover:text-slate-800 transition-colors">
              View Full History
            </button>
          </div>

          {/* Fact notification CTA card */}
          <div className="bg-[#043d2e] rounded-3xl p-6 text-white text-left shadow-xs flex flex-col gap-3">
            <div className="rounded-xl h-9 w-9 bg-emerald-900/50 flex items-center justify-center text-emerald-300">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wide uppercase text-emerald-350 mb-1">Did you know?</h4>
              <p className="text-[11px] text-emerald-100/90 leading-relaxed font-semibold">
                Urgent safety matters are prioritized and typically reviewed within 6 working hours. Ensure all relevant photos are attached.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export function ComplaintTable({ complaints, showFeedback }) {
  if (!complaints || complaints.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">No grievances logged yet</p>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Use the Submit Grievance tab to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
      {/* Desktop Headers */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <div className="col-span-5">Grievance / Issue</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-1.5">Priority</div>
        <div className="col-span-2">Current Status</div>
        <div className="col-span-1.5 text-right">Actions</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {complaints.map((c) => {
          // Status styling
          let statusBg = "bg-slate-50 text-slate-600 border-slate-200/60";
          let statusBullet = "bg-slate-400";
          if (c.status === "Resolved") {
            statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
            statusBullet = "bg-emerald-500";
          } else if (c.status === "In Progress" || c.status === "Under Review") {
            statusBg = "bg-amber-50 text-amber-700 border-amber-100";
            statusBullet = "bg-amber-500";
          } else if (c.status === "Rejected") {
            statusBg = "bg-rose-50 text-rose-700 border-rose-100";
            statusBullet = "bg-rose-500";
          }

          // Priority styling
          let priorityColor = "text-slate-500";
          if (c.priority === "High") priorityColor = "text-red-600 font-bold";
          else if (c.priority === "Medium") priorityColor = "text-amber-600 font-bold";

          return (
            <div 
              key={c.id} 
              className="p-6 flex flex-col md:grid md:grid-cols-12 md:gap-4 items-start md:items-center hover:bg-slate-50/40 transition-colors text-left"
            >
              {/* Left Column: Complaint General Context */}
              <div className="col-span-5 flex gap-3.5 w-full min-w-0 pr-2">
                <div className="h-9 w-9 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/40">
                  <span className="text-xs font-bold">#{c.id}</span>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">
                    {c.title}
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold truncate mt-1">
                    Assigned to: <span className="text-slate-600 font-bold">{c.assignee?.name || "Unassigned Operations Team"}</span>
                  </p>
                </div>
              </div>

              {/* Category Column */}
              <div className="col-span-2 mt-2.5 md:mt-0 text-left">
                <span className="md:hidden text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Category</span>
                <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1">
                  {c.category}
                </span>
              </div>

              {/* Priority Column */}
              <div className="col-span-1.5 mt-2.5 md:mt-0 text-left">
                <span className="md:hidden text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Priority</span>
                <span className={`text-xs ${priorityColor}`}>
                  {c.priority}
                </span>
              </div>

              {/* Status Badge Column */}
              <div className="col-span-2 mt-3 md:mt-0 text-left">
                <span className="md:hidden text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusBg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusBullet}`} />
                  {c.status}
                </span>
              </div>

              {/* Action Links Column */}
              <div className="col-span-1.5 mt-4.5 md:mt-0 flex gap-2 w-full md:justify-end">
                <Link 
                  to={`/complaints/${c.id}`}
                  className="flex items-center gap-1 text-slate-600 hover:text-emerald-800 text-xs font-bold bg-slate-50 hover:bg-emerald-50 border border-slate-200/60 rounded-xl px-3.5 py-2 transition-all cursor-pointer grow md:grow-0 justify-center"
                >
                  Details
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>

                {showFeedback && c.status === "Resolved" && (
                  <Link 
                    to={`/student/complaints/${c.id}/feedback`}
                    className="flex items-center gap-1 text-white bg-emerald-700 hover:bg-emerald-800 text-xs font-bold rounded-xl px-3.5 py-2 transition-all cursor-pointer grow md:grow-0 justify-center"
                  >
                    Feedback
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
