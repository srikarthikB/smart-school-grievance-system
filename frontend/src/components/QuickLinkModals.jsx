import React from "react";
import { X, FileText, ShieldAlert, HelpCircle } from "lucide-react";

export default function QuickLinkModals({ activeModal, onClose }) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto z-10 border border-slate-100 flex flex-col p-6 animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            {activeModal === "policy" && (
              <>
                <FileText className="h-5.5 w-5.5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Policy Document PDF</h3>
              </>
            )}
            {activeModal === "rights" && (
              <>
                <ShieldAlert className="h-5.5 w-5.5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Student Rights Charter</h3>
              </>
            )}
            {activeModal === "faqs" && (
              <>
                <HelpCircle className="h-5.5 w-5.5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Frequently Asked Questions</h3>
              </>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content body based on active modal type */}
        <div className="overflow-y-auto text-sm text-slate-600 space-y-4">
          {activeModal === "policy" && (
            <div className="space-y-4">
              <p className="font-semibold text-slate-800">Smart School Grievance Resolution Standard Policy (v2.1)</p>
              <p>This policy governs the reporting, categorization, assignment, and resolution of grievances submitted by students at our institution.</p>
              
              <div className="space-y-2 mt-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="font-semibold text-emerald-800 text-xs uppercase tracking-wide">1. Submission &amp; Anonymity</p>
                  <p className="text-xs text-slate-600 mt-1">Students can choose to submit grievances anonymously. The administrative system masks student identity parameters from assigned staff to promote uncompromised reporting.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="font-semibold text-emerald-800 text-xs uppercase tracking-wide">2. Classification &amp; Assignment</p>
                  <p className="text-xs text-slate-600 mt-1">Grievances are slotted into Departments (Academic, Facilities, Transport, Others) and routed to specialized personnel for action within 24 hours.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="font-semibold text-emerald-800 text-xs uppercase tracking-wide">3. Timeline &amp; Resolution</p>
                  <p className="text-xs text-slate-600 mt-1">We maintain an average response and assessment period of 4.2 business days. Resolved grievances are open to student feedback loops for 14 continuous days.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 italic text-center">Institution Board Charter Document. Approved for academic session 2026-2027.</p>
            </div>
          )}

          {activeModal === "rights" && (
            <div className="space-y-4">
              <p className="font-semibold text-slate-800">Student Bill of Grievance Rights &amp; Safeguards</p>
              
              <ul className="space-y-3 list-none pl-0">
                <li className="flex gap-2 items-start">
                  <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">1</span>
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">Protection Against Retaliation</span>
                    <span className="text-xs text-slate-500">Every student has the basic right to express concerns regarding faculty, grading equity, and safety protocols without fear of academic or personal penalization.</span>
                  </div>
                </li>

                <li className="flex gap-2 items-start">
                  <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">2</span>
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">Right to Transparent Assignment</span>
                    <span className="text-xs text-slate-500">Students have the absolute right to see who is handling their grievance case file, complete with department alignment and status logs.</span>
                  </div>
                </li>

                <li className="flex gap-2 items-start">
                  <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">3</span>
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">Feedback and Recourse Audit</span>
                    <span className="text-xs text-slate-500">If a grievance resolution is unsatisfactory, students can file feedback with active ratings and comments to trigger review escalation.</span>
                  </div>
                </li>
              </ul>
            </div>
          )}

          {activeModal === "faqs" && (
            <div className="space-y-3">
              {[
                {
                  q: "Who sees my identity if I check 'Submit Anonymously'?",
                  a: "If anonymous, only the primary system administrators can see your enrollment metrics, while the actual staff assigned to look into you and inspect your grievance will see it as 'Anonymous Student'. This safeguards you while retaining high utility."
                },
                {
                  q: "How long does resolving a complaint typically take?",
                  a: "Most complaints are acknowledged within 24 hours. The dynamic resolution window ranges from 2 days (for basic transport or infrastructure repairs) up to 7 days for complex academic or facility inquiries."
                },
                {
                  q: "Can I edit a complaint after submitting it?",
                  a: "No, submissions are locked once logged to preserve procedural authenticity. However, you can read resolution status updates and leave comprehensive review comments in the feedback section."
                },
                {
                  q: "What do the different priority states mean?",
                  a: "Low is for visual or minor operational feedback; Medium is for general logistics or transport bugs; High is reserved for severe academic grading failures, health hazards, or safety breaches."
                }
              ].map((faq, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="font-semibold text-slate-800 text-xs">Q: {faq.q}</p>
                  <p className="text-xs text-slate-600 mt-1 pl-1">A: {faq.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-5 border-t border-slate-100 pt-4 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition-all text-center"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
