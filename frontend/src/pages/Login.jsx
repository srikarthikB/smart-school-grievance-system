import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { 
  Scale, 
  ShieldCheck, 
  HelpCircle, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  BookOpen, 
  Award,
  CheckCircle2,
  LockKeyhole,
  Info
} from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Use screenshot default/example placeholder email
  const [form, setForm] = useState({ 
    email: "student@school.com", 
    password: "password123" 
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function submit(e) {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid institutional credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Helper method to let users click & pre-fill demo credentials instantly
  const handleQuickFill = (roleType) => {
    if (roleType === "student") {
      setForm({ email: "student@school.com", password: "password123" });
    } else if (roleType === "staff") {
      setForm({ email: "staff@school.com", password: "password123" });
    } else if (roleType === "admin") {
      setForm({ email: "admin@school.com", password: "password123" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-[#0c3127] selection:text-white">
      
      {/* Top Brand Banner bar */}
      <header className="bg-white border-b border-slate-100 px-6 sm:px-12 py-4 flex items-center justify-between shadow-3xs relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#0c3127] text-white flex items-center justify-center shadow-3xs">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-slate-800 block">CampusResolve</span>
            <span className="text-[10px] text-[#0c3127] font-black uppercase tracking-wider block">INTEGRITY RESOLUTION</span>
          </div>
        </div>

        {/* Global navigation menu links */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-500">
            <button onClick={() => alert("Policies & SLA directives guide loaded.")} className="hover:text-slate-800 transition-colors cursor-pointer">Policies</button>
            <button onClick={() => alert("Contact Student Affairs support service desk...")} className="hover:text-slate-800 transition-colors cursor-pointer">Support</button>
            <button onClick={() => alert("Access student guidelines and resolution handbooks...")} className="hover:text-slate-800 transition-colors cursor-pointer">Resources</button>
          </div>
          
          {/* Quick toggle default role simulation */}
          <button 
            type="button"
            onClick={() => handleQuickFill("staff")}
            className="bg-[#0c3127] hover:bg-[#0f4033] text-white text-[11px] font-black py-2 px-3.5 rounded-lg transition-all cursor-pointer shadow-3xs uppercase tracking-wide"
          >
            Staff Login
          </button>
        </div>
      </header>

      {/* Main interactive split viewport container */}
      <main className="flex-1 max-w-full w-full mx-auto grid grid-cols-1 lg:grid-cols-12 overflow-hidden p-0">
        
        {/* Left Side: Solid Emerald Green Theme Layout */}
        <section className="lg:col-span-6 bg-[#0c3127] text-white p-8 sm:p-16 flex flex-col justify-between relative overflow-hidden">
          
          {/* Decorative Vector pattern elements */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-[#0c3127] to-[#0a271f] pointer-events-none" />
          
          {/* Transparent Scales design backdrop background */}
          <div className="absolute -right-16 -bottom-16 opacity-10 text-emerald-100 select-none pointer-events-none transform rotate-1  2">
            <Scale className="h-96 w-96" />
          </div>

          <div className="relative z-10 my-auto max-w-lg space-y-8 py-8 lg:py-16 text-left">
            <div>
              <span className="border border-white/20 bg-white/5 backdrop-blur-xs text-[10px] font-black uppercase tracking-widest text-emerald-300 py-1.5 px-3.5 rounded-full inline-block">
                OFFICIAL INSTITUTIONAL PORTAL
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Academic Integrity Portal
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 font-medium leading-relaxed">
                A fair, transparent, and efficient system for institutional resolution. Empowering students and faculty with impartial grievance management.
              </p>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-emerald-800/60 to-transparent" />

            {/* Live Statistics Counter indicators */}
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-1.5 text-left">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">100%</p>
                <p className="text-[10px] text-emerald-300 tracking-wider font-extrabold uppercase">CONFIDENTIAL</p>
              </div>

              <div className="space-y-1.5 text-left">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">24hr</p>
                <p className="text-[10px] text-emerald-300 tracking-wider font-extrabold uppercase">INITIAL RESPONSE</p>
              </div>
            </div>
          </div>

          {/* Quick Demo Pre-Fill Buttons Bar */}
          <div className="relative z-10 border-t border-emerald-800/40 pt-4 flex flex-col gap-2 bg-[#092921]/60 p-4 rounded-2xl">
            <span className="text-[9px] font-extrabold text-emerald-350 tracking-wider uppercase inline-flex items-center gap-1">
              <Info className="h-3 w-3 text-emerald-400" />
              Easy Testing Quick Credentials Fill:
            </span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleQuickFill("student")} 
                className="bg-[#0f4033] hover:bg-[#124e3e] text-emerald-200 border border-emerald-800/50 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer hover:text-white transition-colors"
              >
                Student Demo
              </button>
              <button 
                onClick={() => handleQuickFill("staff")} 
                className="bg-[#0f4033] hover:bg-[#124e3e] text-emerald-200 border border-emerald-800/50 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer hover:text-white transition-colors"
              >
                Staff Member Demo
              </button>
              <button 
                onClick={() => handleQuickFill("admin")} 
                className="bg-[#0f4033] hover:bg-[#124e3e] text-emerald-200 border border-emerald-800/50 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer hover:text-white transition-colors"
              >
                System Administrator
              </button>
            </div>
          </div>

        </section>

        {/* Right Side: Visual White Login Form Canvas */}
        <section className="lg:col-span-6 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative bg-white">
          
          <div className="max-w-md w-full space-y-8">
            
            {/* Main Styled Border Card component */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-3xs text-left relative">
              
              <div className="space-y-2 mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sign In</h2>
                <p className="text-xs sm:text-sm text-slate-400 font-semibold leading-relaxed">
                  Access your grievance dashboard and track existing cases.
                </p>
              </div>

              {/* Login Errors */}
              {error && (
                <div className="bg-rose-50 border border-rose-150 p-3.5 rounded-xl text-xs font-bold text-rose-700 mb-6 flex items-start gap-2.5 animate-pulse">
                  <Lock className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submission Form structure */}
              <form onSubmit={submit} className="space-y-5">
                
                {/* Email address field */}
                <div className="space-y-1.5 focus-within:text-[#0c3127] transition-all">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    University Email
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

                {/* Password field with Forgot link option */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Password
                    </label>
                    <button 
                      type="button"
                      onClick={() => alert("Please contact the IT Desk setup system center for secure password retrieval.")}
                      className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl pl-11 pr-11 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0c3127] p-1 rounded transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Custom styled Checkbox selection */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-250 text-[#0c3127] focus:ring-[#0c3127] h-4 w-4"
                    />
                    <span className="text-xs text-slate-500 font-bold">Remember me for 30 days</span>
                  </label>
                </div>

                {/* Main Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0c3127] hover:bg-[#0f4033] disabled:opacity-55 text-white font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98"
                >
                  <span>{loading ? "Authenticating Account..." : "Login to Portal"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

              </form>

              {/* Muted decorative partition spacer */}
              <div className="my-6 border-t border-slate-100" />

              {/* Redirection point */}
              <div className="text-center">
                <span className="text-xs text-slate-500 font-semibold">Don't have an account? </span>
                <Link 
                  to="/register" 
                  className="text-xs font-black text-[#0c3127] hover:underline"
                >
                  Register Now
                </Link>
              </div>

            </div>

            {/* Outer bottom quick legal and compliance directories info */}
            <div className="flex items-center justify-center gap-6 text-[11px] font-bold text-slate-400">
              <button onClick={() => alert("Privacy Policies context documentation...")} className="hover:text-slate-700 cursor-pointer">Privacy Policy</button>
              <span className="h-1.5 w-1.5 bg-slate-200 rounded-full" />
              <button onClick={() => alert("Terms of Service declaration...")} className="hover:text-slate-700 cursor-pointer">Terms of Service</button>
              <span className="h-1.5 w-1.5 bg-slate-200 rounded-full" />
              <button onClick={() => alert("Accessibility criteria status checklist...")} className="hover:text-slate-700 cursor-pointer">Accessibility</button>
            </div>

          </div>

        </section>

      </main>

      {/* Global institutional administrative footer bar */}
      <footer className="bg-slate-50 border-t border-slate-100 px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <span>© 2024 Institutional Student Affairs. All rights reserved.</span>
        
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Secure Server</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <HelpCircle className="h-4 w-4 text-slate-400" />
            <span>24/7 Support</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
