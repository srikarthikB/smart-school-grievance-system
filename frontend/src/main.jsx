import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./styles.css";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { useAuth } from "./auth/AuthContext.jsx";
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
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ComplaintManagement from "./pages/admin/ComplaintManagement.jsx";
import UserManagement from "./pages/admin/UserManagement.jsx";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<RoleHome />} />
            <Route path="/student" element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/create" element={<ProtectedRoute roles={["student"]}><CreateComplaint /></ProtectedRoute>} />
            <Route path="/student/complaints" element={<ProtectedRoute roles={["student"]}><MyComplaints /></ProtectedRoute>} />
            <Route path="/student/complaints/:id/feedback" element={<ProtectedRoute roles={["student"]}><FeedbackForm /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute roles={["staff"]}><StaffComplaints /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/complaints" element={<ProtectedRoute roles={["admin"]}><ComplaintManagement /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute roles={["admin"]}><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="/complaints/:id" element={<ComplaintDetails />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/student" replace />;
}
