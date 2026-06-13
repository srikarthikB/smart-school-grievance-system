import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  File, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  BadgeAlert,
  Paperclip,
  Info
} from "lucide-react";

export default function CreateComplaint() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Academic",
    priority: "Medium",
    is_anonymous: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple step validation helpers
  const isDetailsValid = () => {
    return form.title.trim().length > 3 && form.description.trim().length > 10;
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1 && !isDetailsValid()) {
      setError("Please check your inputs. Title must be at least 4 characters and description must be at least 10 characters.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  async function submit(e) {
    if (e) e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/complaints", form);
      navigate("/student/complaints");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save your complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Page Title & Subtitle */}
      <div className="mb-8">
        <h2 className="text-[#0f172a] text-3xl font-extrabold tracking-tight">Submit New Grievance</h2>
        <p className="text-slate-500 text-sm font-semibold mt-1.5">
          Please provide accurate information to help us resolve your issue promptly.
        </p>
      </div>

      {/* Progress Multi-step Tracker */}
      <div className="mb-10 relative">
        <div className="absolute top-5 left-0 w-full h-[1px] bg-slate-200 z-0" />
        
        <div className="relative z-10 flex justify-between">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Evidence" },
            { num: 3, label: "Review" }
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;

            return (
              <div 
                key={s.num} 
                onClick={() => {
                  if (s.num < step) {
                    setStep(s.num);
                  } else if (s.num === 2 && isDetailsValid()) {
                    setStep(2);
                  } else if (s.num === 3 && isDetailsValid()) {
                    setStep(3);
                  }
                }}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className={`
                  h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                  ${isActive 
                    ? "bg-[#0b3c2e] text-white ring-4 ring-emerald-50" 
                    : isCompleted 
                      ? "bg-emerald-600 text-white" 
                      : "bg-slate-200 text-slate-500 hover:bg-slate-300"}
                `}>
                  {s.num}
                </div>
                <span className={`
                  text-xs font-bold mt-2 transition-all
                  ${isActive 
                    ? "text-[#0b3c2e]" 
                    : isCompleted 
                      ? "text-emerald-700" 
                      : "text-slate-400 group-hover:text-slate-600"}
                `}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        
        {/* Error Notification Alert */}
        {error && (
          <div className="bg-red-50/80 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-800 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* STEP 1: DETAILS */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-slate-900 font-extrabold text-lg">Complaint Details</h3>
            
            {/* Grievance Type Dropdown Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Grievance Type</label>
              <div className="relative">
                <select 
                  value={form.category} 
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#043d2e] appearance-none"
                >
                  {["Academic", "Faculty", "Student", "Infrastructure", "Transport", "Administration", "Other"].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Priority Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Priority Level</label>
              <div className="flex gap-3">
                {["Low", "Medium", "High"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer
                      ${form.priority === p 
                        ? p === "High" 
                          ? "bg-red-600 text-white border-red-600" 
                          : p === "Medium" 
                            ? "bg-amber-500 text-white border-amber-500" 
                            : "bg-emerald-700 text-white border-emerald-700"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}
                    `}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Subject Title</label>
              <input 
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Briefly describe the issue..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#043d2e]"
              />
            </div>

            {/* Description Textarea */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Detailed Description</label>
              <textarea 
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Provide a full account of the grievance with relevant dates, persons involved, and any prior attempts at resolution..."
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#043d2e] resize-y"
              />
            </div>

            {/* Confidentiality Notice */}
            <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
              <Lock className="h-4 w-4 text-[#064e3b] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-[#064e3b]">Confidentiality Notice</p>
                <p className="text-[11px] text-[#2c533e] leading-relaxed font-semibold">
                  Your submission is protected under the Institutional Integrity Act. All information provided will be handled with strict confidentiality and shared only with the relevant oversight committee.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EVIDENCE — attachment support planned for a future release */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-900 font-extrabold text-lg">Supportive Evidence</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Step 2 of 3</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Attach receipts, screenshots, timetable logs, or correspondence records to bolster your grievance. Attachment support is coming in a future release.
            </p>

            {/* Planned feature notice — clearly by design, not an error */}
            <div className="border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-center bg-slate-50/40">
              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <Paperclip className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-700">Attachments not yet available</p>
                <p className="text-xs text-slate-400 font-semibold mt-1 max-w-xs mx-auto leading-relaxed">
                  Evidence upload is planned for a future release. You can proceed without attachments — your written description will be reviewed by the assigned staff member.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] text-amber-700 font-bold">Supports PDF, PNG, JPG — coming soon</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW AND CONFIRM */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-slate-900 font-extrabold text-lg">Review and Submit</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Ensure all parameters are accurate. Once registered, your submission is locked to maintain investigative records.
            </p>

            {/* Grid Audit Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-xs">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Classification Group</span>
                <span className="font-bold text-slate-800">{form.category}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Urgency Priority</span>
                <span className={`inline-flex items-center gap-1.5 font-bold 
                  ${form.priority === "High" ? "text-red-600" : form.priority === "Medium" ? "text-amber-600" : "text-emerald-700"}
                `}>
                  {form.priority} Level
                </span>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2 border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subject Summary</span>
                <span className="font-extrabold text-slate-800">{form.title}</span>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2 border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Detailed Narrative</span>
                <span className="font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">{form.description}</span>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2 border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attachments</span>
                <span className="text-[11px] text-slate-400 font-semibold italic">No attachments — evidence upload coming in a future release.</span>
              </div>
            </div>

            {/* Anonymity Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-slate-800 block cursor-pointer" htmlFor="anon-toggle">
                  Submit anonymously to assigned staff
                </label>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  Masks your profile identity parameters from inspectors. Administrators can trace in emergency.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  id="anon-toggle"
                  checked={form.is_anonymous} 
                  onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#043d2e]"></div>
              </label>
            </div>
          </div>
        )}

        {/* Card Footer Action Strip */}
        <div className="border-t border-slate-100 pt-6 mt-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handlePrevStep}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="flex items-center gap-2 bg-[#043d2e] hover:bg-[#0a4d3c] active:scale-98 text-white text-xs font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-sm cursor-pointer ml-auto"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 active:scale-98 text-white text-xs font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-sm cursor-pointer ml-auto"
            >
              {isSubmitting ? "Submitting..." : "Submit Grievance"}
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}