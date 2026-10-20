import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import api from "../api/client";
import { formatErrorMessage } from "../utils/errorMessage.js";
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings, 
  LogOut, 
  ClipboardCheck, 
  Users, 
  BarChart3, 
  Menu, 
  X,
  Scale,
  HelpCircle,
  Bell
} from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const mobileMenuButtonRef = useRef(null);
  const unreadNotificationCount = notifications.filter((item) => !item.is_read).length;

  function toggleNotifications() {
    setNotificationsOpen((open) => !open);
  }

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function handleMenuKeyDown(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleMenuKeyDown);
    return () => window.removeEventListener("keydown", handleMenuKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await api.get("/notifications/mine");
        if (active) {
          setNotifications(response.data || []);
          setNotificationError("");
        }
      } catch (error) {
        if (active) setNotificationError(formatErrorMessage(error, "Could not load notifications."));
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 45000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  async function openNotification(item) {
    setNotificationError("");
    if (!item.is_read) {
      try {
        await api.patch(`/notifications/${item.id}/read`);
        setNotifications((current) => current.map((notification) => (
          notification.id === item.id ? { ...notification, is_read: true } : notification
        )));
      } catch (error) {
        setNotificationError(formatErrorMessage(error, "Could not mark the notification as read."));
      }
    }
    setNotificationsOpen(false);
    if (item.complaint_id) navigate(`/complaints/${item.complaint_id}`);
  }

  async function markAllNotificationsRead() {
    setNotificationsBusy(true);
    setNotificationError("");
    try {
      await api.post("/notifications/read-all");
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    } catch (error) {
      setNotificationError(formatErrorMessage(error, "Could not mark notifications as read."));
    } finally {
      setNotificationsBusy(false);
    }
  }

  // Determine portal branding parameters dynamically based on user roles
  let brandName = "Student Portal";
  let brandSubText = "CENTRALIZED RESOLVE";

  if (user?.role === "staff") {
    brandName = "Staff Portal";
    brandSubText = "MANAGEMENT CONSOLE";
  } else if (user?.role === "admin") {
    brandName = "Admin Portal";
    brandSubText = "EXECUTIVE CONSOLE";
  }

  // Define sidebar menu items based on roles with appropriate metadata
  const menuItems = [];
  if (user?.role === "student") {
    menuItems.push(
      {
        label: "Dashboard",
        path: "/student",
        icon: LayoutDashboard,
      },
      {
        label: "Submit Grievance",
        path: "/student/create",
        icon: PlusCircle,
      },
      {
        label: "Track Status",
        path: "/student/complaints",
        icon: History,
      }
    );
  } else if (user?.role === "staff") {
    menuItems.push(
      {
        label: "Dashboard",
        path: "/staff",
        icon: LayoutDashboard,
        isDashboardLink: true
      },
      {
        label: "Active Cases",
        path: "/staff/complaints",
        icon: ClipboardCheck,
        isActiveCasesLink: true
      },
      {
        label: "Closed Cases",
        path: "/staff/closed",
        icon: History,
      },
      {
        label: "Analytics",
        path: "/staff/analytics",
        icon: BarChart3,
      },
      {
        label: "Settings",
        path: "/staff/settings",
        icon: Settings,
      }
    );
  } else if (user?.role === "admin") {
    menuItems.push(
      {
        label: "Dashboard",
        path: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Complaints",
        path: "/admin/complaints",
        icon: ClipboardCheck,
      },
      {
        label: "Verification Review",
        path: "/admin/verification",
        icon: History,
      },
      {
        label: "Users",
        path: "/admin/users",
        icon: Users,
      },
      {
        label: "Analytics",
        path: "/admin/analytics",
        icon: BarChart3,
      }
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans selection:bg-[#0c3127] selection:text-white">
      
      {/* Mobile Top Header bar */}
      <header className="md:hidden bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-3xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8.5 w-8.5 rounded-lg bg-[#0c3127] text-white flex items-center justify-center">
            <Scale className="h-4.5 w-4.5" />
          </div>
          <div className="text-left">
            <strong className="text-slate-800 text-sm font-black tracking-tight">{brandName}</strong>
            <span className="text-[9px] text-[#0c3127] font-black uppercase tracking-wider block mt-0.5">{brandSubText}</span>
          </div>
        </div>
        
        <button
          ref={mobileMenuButtonRef}
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          className="p-2 text-slate-500 hover:text-emerald-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127]"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Main left sidebar container for desktop layout & mobile overlay drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-3.5 transform transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0 shrink-0
        ${mobileMenuOpen ? "translate-x-0 visible" : "-translate-x-full invisible md:translate-x-0 md:visible"}
      `}>
        <div className="flex flex-col gap-7">
          
          {/* Institutional Branding Block */}
          <div className="hidden md:flex items-center gap-2.5 px-3">
            <div className="h-9 w-9 rounded-xl bg-[#0c3127] text-white flex items-center justify-center shadow-3xs">
              <Scale className="h-4.5 w-4.5" />
            </div>
            <div className="text-left font-sans">
              <span className="text-sm font-black tracking-tight text-slate-800 block leading-none">{brandName}</span>
              <span className="text-[10px] text-[#0c3127] font-black uppercase tracking-wider block mt-1.5 leading-none">{brandSubText}</span>
            </div>
          </div>

          {/* Quick interactive user info metrics row inside sidebar */}
          <div className="mx-2 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-lg bg-emerald-100 border border-emerald-200/50 flex items-center justify-center text-[#0c3127] font-black text-xs shrink-0">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[12.5px] font-black text-slate-800 truncate leading-tight">{user?.name || "User"}</p>
              <p className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wide truncate mt-1 leading-none">{user?.role || "Student"}</p>
            </div>
          </div>

          {/* Core navigation links */}
          <nav id="primary-navigation" aria-label="Primary navigation" className="flex flex-col gap-1.5 px-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              // Determine active states matching Stitch layouts
              let isActive = location.pathname === item.path;
              
              if (user?.role === "staff") {
                // Dashboard is only active on exactly /staff
                if (item.isDashboardLink) {
                  isActive = location.pathname === "/staff";
                }
                // Active Cases is only active on /staff/complaints
                if (item.isActiveCasesLink) {
                  isActive = location.pathname === "/staff/complaints";
                }
              }

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold transition-all duration-150 text-left border-l-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127]
                    ${isActive 
                      ? "bg-emerald-50 text-[#0c3127] border-l-[#0c3127] shadow-sm"
                      : "border-l-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon aria-hidden="true" className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#0c3127]" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Outer bottom layout actions - Help Support & logout keys */}
        <div className="flex flex-col gap-4 px-1 pt-6 border-t border-slate-100">
          
          {/* Main quick trigger for support block */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              alert("Contacting the institutional student affairs helpline support network...");
            }}
            className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127]"
          >
            <HelpCircle className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <span>Support</span>
          </button>

          {/* Secure Institutional Logout Action */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-extrabold text-rose-600 hover:bg-rose-50/50 transition-colors w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3127]"
          >
            <LogOut className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            <span>Logout</span>
          </button>

        </div>
      </aside>

      {/* Mobile background overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Primary viewport content display wrapper */}
      <main className="flex-1 min-w-0 p-4 sm:p-7 lg:p-9 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto">
          <div className="relative mb-5 flex justify-end">
            <button
              type="button"
              onClick={toggleNotifications}
              aria-expanded={notificationsOpen}
              aria-controls="notification-center"
              aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`}
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-900"
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unreadNotificationCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </button>
            <div id="notification-center" hidden={!notificationsOpen} className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <span className="text-sm font-extrabold text-slate-800">Notification center</span>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    disabled={notificationsBusy || !notifications.some((item) => !item.is_read)}
                    className="text-[10px] font-bold text-emerald-800 hover:underline disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                </div>
                {notificationError && (
                  <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-800">
                    {notificationError}
                  </div>
                )}
                <div className="max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <p className="p-6 text-center text-xs text-slate-500">Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-400">You're all caught up.</p>
                  ) : notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openNotification(item)}
                      className={`w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-emerald-50/50 ${item.is_read ? "bg-white" : "bg-emerald-50/40"}`}
                    >
                      <span className="flex items-start gap-2">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? "bg-slate-200" : "bg-emerald-600"}`} />
                        <span className="min-w-0">
                          <span className="block text-xs font-extrabold text-slate-800">{item.title}</span>
                          <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{item.message}</span>
                          <time dateTime={item.created_at} className="mt-1 block text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleString()}
                          </time>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
            </div>
          </div>
          {notificationError && !notificationsOpen && (
            <p role="alert" className="mb-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              {notificationError}
            </p>
          )}
          <Outlet />
        </div>
      </main>

    </div>
  );
}
