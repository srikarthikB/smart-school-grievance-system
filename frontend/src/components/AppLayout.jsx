import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
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
  HelpCircle
} from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        path: "/staff",
        icon: History,
      },
      {
        label: "Analytics",
        path: "/staff",
        icon: BarChart3,
      },
      {
        label: "Settings",
        path: "/staff",
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
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-500 hover:text-emerald-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Main left sidebar container for desktop layout & mobile overlay drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-150 flex flex-col justify-between py-7 px-4 transform transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0 shrink-0
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex flex-col gap-8">
          
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
          <nav className="flex flex-col gap-1 px-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              
              // Determine active states matching Stitch layouts
              let isActive = location.pathname === item.path;
              
              if (user?.role === "staff") {
                // For staff console sidebar "Active Cases" is highlighted by default on /staff
                if (item.isActiveCasesLink && (location.pathname === "/staff" || location.pathname === "/staff/complaints")) {
                  isActive = true;
                } else if (item.isDashboardLink && (location.pathname === "/staff" || location.pathname === "/staff/complaints")) {
                  isActive = false;
                }
              }

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4.5 py-3 rounded-xl text-[13px] font-bold transition-all duration-150 text-left border-l-[3px]
                    ${isActive 
                      ? "bg-emerald-50/75 text-[#0c3127] border-l-[#0c3127]" 
                      : "border-l-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }
                  `}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#0c3127]" : "text-slate-400"}`} />
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
            className="flex items-center gap-3.5 px-4.5 py-2.5 rounded-xl text-[13.5px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors w-full text-left"
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
            className="flex items-center gap-3.5 px-4.5 py-2.5 rounded-xl text-[13px] font-extrabold text-rose-600 hover:bg-rose-50/50 transition-colors w-full text-left"
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
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Primary viewport content display wrapper */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 md:p-10 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

    </div>
  );
}


