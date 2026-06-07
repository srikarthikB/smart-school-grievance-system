import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <>
      <nav>
        <strong>School Grievances</strong>
        {user?.role === "student" && (
          <>
            <Link to="/student">Dashboard</Link>
            <Link to="/student/create">Create Complaint</Link>
            <Link to="/student/complaints">My Complaints</Link>
          </>
        )}
        {user?.role === "staff" && <Link to="/staff">Assigned Complaints</Link>}
        {user?.role === "admin" && (
          <>
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/complaints">Complaints</Link>
            <Link to="/admin/users">Users</Link>
            <Link to="/admin/analytics">Analytics</Link>
          </>
        )}
        <span>{user?.name} ({user?.role})</span>
        <button onClick={logout}>Logout</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
