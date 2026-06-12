import React, { useState, useEffect } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext.jsx";
import {
  User,
  Bell,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Info,
} from "lucide-react";

// ── Small section wrapper ──────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-3xs overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="h-8 w-8 rounded-xl bg-emerald-50 text-[#0c3127] flex items-center justify-center border border-emerald-100/50">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-black text-slate-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Labelled input ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10.5px] text-slate-400 font-medium">{hint}</p>
      )}
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#0c3127]" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function StaffSettings() {
  const { user } = useAuth();

  // ── Profile state ────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    department: user?.department || "",
    phone: user?.phone || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'success'|'error', text }

  // ── Password state ───────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // ── Notification preferences ─────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    new_assignment: true,
    status_update: true,
    deadline_reminder: true,
    feedback_received: false,
    weekly_digest: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState(null);

  // Pre-fill name/email from auth context whenever it changes
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await api.patch("/users/me", {
        name: profileForm.name,
        department: profileForm.department,
        phone: profileForm.phone,
      });
      setProfileMsg({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (err) {
      setProfileMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Profile update failed. Check that the endpoint exists on your backend.",
      });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 5000);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwMsg({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await api.post("/users/me/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Password change failed. Verify your current password.",
      });
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(null), 5000);
    }
  };

  const handleNotifSave = async (e) => {
    e.preventDefault();
    setNotifSaving(true);
    setNotifMsg(null);
    try {
      await api.patch("/users/me/notifications", notifs);
      setNotifMsg({
        type: "success",
        text: "Notification preferences saved.",
      });
    } catch (err) {
      // Graceful degradation — settings saved locally even if endpoint missing
      setNotifMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Could not save to server — preferences reflect your current session only.",
      });
    } finally {
      setNotifSaving(false);
      setTimeout(() => setNotifMsg(null), 5000);
    }
  };

  // ── Inline feedback banners ───────────────────────────────────────────────────
  const Feedback = ({ msg }) => {
    if (!msg) return null;
    return (
      <div
        className={`flex items-center gap-2.5 text-xs font-bold rounded-xl px-4 py-3 ${
          msg.type === "success"
            ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
            : "bg-rose-50 border border-rose-100 text-rose-800"
        }`}
      >
        {msg.type === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0" />
        )}
        {msg.text}
      </div>
    );
  };

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0c3127] transition-all";

  const disabledClass =
    "w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-400 cursor-not-allowed";

  return (
    <div className="font-sans text-left pb-12 space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-black text-[#0c3127] tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-slate-400 font-bold mt-0.5">
          Manage your profile, security, and notification preferences
        </p>
      </div>

      {/* ── Profile Section ─────────────────────────────────────────────────── */}
      <Section icon={User} title="Profile Information">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Your full name"
                className={inputClass}
                required
              />
            </Field>

            <Field label="Email Address" hint="Contact your admin to change your email.">
              <input
                type="email"
                value={profileForm.email}
                readOnly
                className={disabledClass}
                tabIndex={-1}
              />
            </Field>

            <Field label="Department">
              <input
                type="text"
                value={profileForm.department}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, department: e.target.value }))
                }
                placeholder="e.g. Student Affairs"
                className={inputClass}
              />
            </Field>

            <Field label="Phone / Extension">
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="e.g. +91 98765 43210"
                className={inputClass}
              />
            </Field>
          </div>

          <Feedback msg={profileMsg} />

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 bg-[#0c3127] hover:bg-[#0f4033] disabled:opacity-60 text-white py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider shadow-3xs active:scale-98 transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {profileSaving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Password Section ─────────────────────────────────────────────────── */}
      <Section icon={Lock} title="Change Password">
        <form onSubmit={handlePasswordSave} className="space-y-4">
          {[
            { key: "current_password", label: "Current Password", showKey: "current" },
            { key: "new_password", label: "New Password", showKey: "new" },
            {
              key: "confirm_password",
              label: "Confirm New Password",
              showKey: "confirm",
            },
          ].map(({ key, label, showKey }) => (
            <Field key={key} label={label}>
              <div className="relative">
                <input
                  type={showPw[showKey] ? "text" : "password"}
                  value={pwForm[key]}
                  onChange={(e) =>
                    setPwForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  placeholder="••••••••"
                  className={inputClass + " pr-11"}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPw((p) => ({ ...p, [showKey]: !p[showKey] }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPw[showKey] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          ))}

          <Feedback msg={pwMsg} />

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwSaving}
              className="inline-flex items-center gap-2 bg-[#0c3127] hover:bg-[#0f4033] disabled:opacity-60 text-white py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider shadow-3xs active:scale-98 transition-all cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Notifications Section ────────────────────────────────────────────── */}
      <Section icon={Bell} title="Notification Preferences">
        <form onSubmit={handleNotifSave} className="space-y-5">
          {[
            {
              key: "new_assignment",
              label: "New Case Assignment",
              desc: "Alert when a grievance is assigned to you.",
            },
            {
              key: "status_update",
              label: "Status Update Confirmations",
              desc: "Confirmation when you update a case status.",
            },
            {
              key: "deadline_reminder",
              label: "SLA / Deadline Reminders",
              desc: "24-hour warnings before resolution deadlines.",
            },
            {
              key: "feedback_received",
              label: "Student Feedback Received",
              desc: "Notify when a student submits feedback on a closed case.",
            },
            {
              key: "weekly_digest",
              label: "Weekly Summary Digest",
              desc: "A weekly email summarising your caseload activity.",
            },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-[12.5px] font-extrabold text-slate-700">
                  {label}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {desc}
                </p>
              </div>
              <Toggle
                checked={notifs[key]}
                onChange={(val) => setNotifs((p) => ({ ...p, [key]: val }))}
              />
            </div>
          ))}

          <Feedback msg={notifMsg} />

          <div className="pt-2 border-t border-slate-50">
            <button
              type="submit"
              disabled={notifSaving}
              className="inline-flex items-center gap-2 bg-[#0c3127] hover:bg-[#0f4033] disabled:opacity-60 text-white py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider shadow-3xs active:scale-98 transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {notifSaving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </form>
      </Section>

      {/* Info notice */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-1.5 rounded-xl bg-emerald-100 text-[#0c3127] shrink-0">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div>
          <strong className="text-[10px] font-black uppercase text-[#0c3127] tracking-wider block">
            Backend Compatibility
          </strong>
          <p className="text-[11px] text-emerald-900 font-medium leading-relaxed mt-0.5">
            Profile updates call <code className="font-mono">PATCH /users/me</code>. Password changes call{" "}
            <code className="font-mono">POST /users/me/change-password</code>. If these endpoints are not yet
            implemented, changes will show an informative error and will not be persisted.
          </p>
        </div>
      </div>
    </div>
  );
}