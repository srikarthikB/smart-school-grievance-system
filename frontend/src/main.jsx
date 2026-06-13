import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from "react-router-dom";
import "./styles.css";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import CreateComplaint from "./pages/student/CreateComplaint.jsx";
import MyComplaints from "./pages/student/MyComplaints.jsx";
import ComplaintDetails from "./pages/ComplaintDetails.jsx";
import FeedbackForm from "./pages/student/FeedbackForm.jsx";
import StaffComplaints from "./pages/staff/StaffComplaints.jsx";
import StaffDashboard from "./pages/staff/StaffDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ComplaintManagement from "./pages/admin/ComplaintManagement.jsx";
import UserManagement from "./pages/admin/UserManagement.jsx";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard.jsx";
import StaffClosedCases from "./pages/staff/StaffClosedCases.jsx";
import StaffAnalytics from "./pages/staff/StaffAnalytics.jsx";
import StaffSettings from "./pages/staff/StaffSettings.jsx";
import { ROLES } from "./constants/roles.js"; // BUG-08

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
}

// BUG-11: RouterBoundary lives *inside* <Router> so it can call useNavigate.
// It wires the navigate function into AuthContext so logout() can redirect
// to /login without AuthProvider needing to know about react-router directly.
function RouterBoundary() {
  const navigate = useNavigate();
  const { setOnLogout } = useAuth();

  React.useEffect(() => {
    setOnLogout(() => navigate("/login", { replace: true }));
  }, [navigate, setOnLogout]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<RoleHome />} />
        <Route path="/student" element={<ProtectedRoute roles={[ROLES.STUDENT]}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/create" element={<ProtectedRoute roles={[ROLES.STUDENT]}><CreateComplaint /></ProtectedRoute>} />
        <Route path="/student/complaints" element={<ProtectedRoute roles={[ROLES.STUDENT]}><MyComplaints /></ProtectedRoute>} />
        <Route path="/student/complaints/:id/feedback" element={<ProtectedRoute roles={[ROLES.STUDENT]}><FeedbackForm /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute roles={[ROLES.STAFF]}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/complaints" element={<ProtectedRoute roles={[ROLES.STAFF]}><StaffComplaints /></ProtectedRoute>} />
        <Route path="/staff/closed" element={<ProtectedRoute roles={[ROLES.STAFF]}><StaffClosedCases /></ProtectedRoute>} />
        <Route path="/staff/analytics" element={<ProtectedRoute roles={[ROLES.STAFF]}><StaffAnalytics /></ProtectedRoute>} />
        <Route path="/staff/settings" element={<ProtectedRoute roles={[ROLES.STAFF]}><StaffSettings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute roles={[ROLES.ADMIN]}><ComplaintManagement /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={[ROLES.ADMIN]}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AnalyticsDashboard /></ProtectedRoute>} />
        {/* BUG-07: All roles can reach this route, but the backend GET
            /complaints/:id handler MUST enforce ownership (students may only
            fetch their own complaints). This component cannot do that. */}
        <Route
          path="/complaints/:id"
          element={
            <ProtectedRoute roles={[ROLES.STUDENT, ROLES.STAFF, ROLES.ADMIN]}>
              <ComplaintDetails />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* BUG-11: Router now wraps AuthProvider so RouterBoundary (inside
        AuthProvider's subtree) can call useNavigate to wire logout redirect. */}
    <Router>
      <AuthProvider>
        <RouterBoundary />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

// BUG-09: Added explicit student branch and an unknown-role fallback that
// forces logout instead of silently granting student access.
function RoleHome() {
  const { user, logout } = useAuth();
  if (user?.role === ROLES.ADMIN) return <Navigate to="/admin" replace />;
  if (user?.role === ROLES.STAFF) return <Navigate to="/staff" replace />;
  if (user?.role === ROLES.STUDENT) return <Navigate to="/student" replace />;
  // Unknown or missing role — corrupt account, force logout.
  logout();
  return <Navigate to="/login" replace />;
}