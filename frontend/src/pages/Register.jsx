import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { 
  Scale, 
  HelpCircle, 
  User, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Info,
  BookOpen
} from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Keep existing form state structure and add confirmation / student ID visuals natively
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    confirmPassword: "",
    studentId: "",
    role: "student", 
    department: "Academic" 
  });

  const [error, setError] = useState("");
  const [agreePolicy, setAgreePolicy] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    if (e) e.preventDefault();
    setError("");

    // Keep existing validation checks & add user-friendly alerts
    if (!form.name.trim()) {
      setError("Please provide your full legal name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Institutional email address is required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords you entered do not match.");
      return;
    }
    if (!agreePolicy) {
      setError("You must agree to the institutional Privacy Policy to proceed.");
      return;
    }

    setLoading(true);
    try {
      // Reconstruct the exact register payload expected by backend credentials rules:
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "student",
        department: form.department
      };

      await register(payload);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. This account may already exist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans selection:bg-[#0c3127] selection:text-white">
      
      {/* Visual institutional portal header */}
      <header className="bg-white border-b border-slate-100 px-6 sm:px-12 py-4 flex items-center justify-between shadow-3xs relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#0c3127] text-white flex items-center justify-center shadow-3xs">
            <Scale className="h-5 w-5" />
          </div>
          <span className="text-sm font-black tracking-tight text-slate-800">
            Academic Integrity Portal
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
          <button 
            type="button"
            onClick={() => alert("Connecting to the university student affairs help desk support network...")} 
            className="hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help Center</span>
          </button>
          
          <button 
            type="button"
            onClick={() => alert("Displaying resolution bylaws & compliance directives...")} 
            className="hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="h-4 w-4" />
            <span>Guidelines</span>
          </button>
        </div>
      </header>

      {/* Main Registration Content Viewport */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10 flex flex-col items-center justify-center space-y-6">
        
        {/* Registration Card Layout */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-3xs text-left w-full">
          
          {/* Headline block */}
          <div className="space-y-2 mb-8">
            <h1 className="text-[#0c3127] text-2xl sm:text-3xl font-black tracking-tight">
              Create Student Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold leading-relaxed">
              Register to file grievances, track case progress, and communicate with university representatives.
            </p>
          </div>

          {/* Validation Alert messages */}
          {error && (
            <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl text-xs font-bold text-rose-700 mb-6 flex items-start gap-2.5 animate-pulse">
              <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Main styled form */}
          <form onSubmit={submit} className="space-y-6">
            
            {/* SECTION 1: Personal Information header line */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <User className="h-4 w-4 text-emerald-850" />
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Personal Information
                </h3>
              </div>

              {/* Full Name field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all"
                />
              </div>

              {/* Row Grid: Student ID + Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Student ID Code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Student ID
                  </label>
                  <input 
                    type="text"
                    required
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    placeholder="e.g. 2024-XXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all"
                  />
                </div>

                {/* Main Program selection dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Department
                  </label>
                  <select 
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-705 focus:outline-none focus:ring-1 focus:ring-[#0c3127] cursor-pointer"
                  >
                    {["Academic", "Discipline", "Infrastructure", "Transport", "Administration"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

            </div>

            {/* SECTION 2: Account Credentials header line */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <Lock className="h-4 w-4 text-emerald-850" />
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Account Credentials
                </h3>
              </div>

              {/* Institutional Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="student@university.edu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all"
                  />
                </div>
              </div>

              {/* Row Grid: Password + Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Password
                  </label>
                  <input 
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all"
                  />
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Confirm Password
                  </label>
                  <input 
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-202 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all"
                  />
                </div>

              </div>

            </div>

            {/* Privacy Policy Checkbox agreement */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  required
                  checked={agreePolicy}
                  onChange={(e) => setAgreePolicy(e.target.checked)}
                  className="rounded border-slate-250 text-[#0c3127] focus:ring-[#0c3127] h-4 w-4 mt-0.5 shrink-0"
                />
                <span className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  I agree to the <span className="font-extrabold text-[#0c3127]">Privacy Policy</span> and understand that any information provided will be used solely for academic grievance processing under institutional ethics.
                </span>
              </label>
            </div>

            {/* Main Submit action button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0c3127] hover:bg-[#0f4033] disabled:opacity-55 text-white font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98"
            >
              <span>{loading ? "Creating Institutional Account..." : "Register"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

          </form>

          {/* Simple separation marker */}
          <div className="my-6 border-t border-slate-100" />

          {/* Login fallback redirect row */}
          <div className="text-center text-xs">
            <span className="text-slate-500 font-semibold">Already have an account? </span>
            <Link 
              to="/login" 
              className="font-black text-[#0c3127] hover:underline"
            >
              Login
            </Link>
          </div>

        </div>

        {/* Confidentiality Notice Alert Box matches layout design explicitly */}
        <div className="w-full bg-emerald-50 rounded-2xl border border-emerald-150 p-4 flex items-start gap-3.5 text-left">
          <div className="p-1.5 rounded-xl bg-emerald-100 text-[#0c3127] shrink-0">
            <Info className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <strong className="text-[10px] font-black uppercase text-[#0c3127] tracking-wider block">
              Confidentiality Notice
            </strong>
            <p className="text-[11.5px] text-emerald-900 font-medium leading-relaxed">
              Your credentials and grievance data are encrypted and accessible only by authorized ethics committee members.
            </p>
          </div>
        </div>

      </main>

      {/* Global outer administrative layout footer widget elements */}
      <footer className="bg-slate-50 border-t border-slate-100 px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <span>© 2024 Academic Integrity Portal. All rights reserved.</span>
        
        <div className="flex items-center gap-6">
          <button onClick={() => alert("Privacy specifications...")} className="hover:text-slate-700 transition-colors cursor-pointer">PRIVACY</button>
          <button onClick={() => alert("Security mechanisms and measures...")} className="hover:text-slate-700 transition-colors cursor-pointer">SECURITY</button>
          <button onClick={() => alert("Support contact details...")} className="hover:text-slate-700 transition-colors cursor-pointer">CONTACTS</button>
        </div>
      </footer>

    </div>
  );
}
