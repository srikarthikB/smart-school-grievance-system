import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get("/analytics").then((res) => setAnalytics(res.data));
  }, []);

  return (
    <>
      <h1>Admin Dashboard</h1>
      {analytics && (
        <>
          <p>Total complaints: {analytics.total_complaints}</p>
          <p>Resolution rate: {analytics.resolution_rate}%</p>
        </>
      )}
      <p><Link to="/admin/complaints">Manage complaints</Link></p>
      <p><Link to="/admin/users">Manage users</Link></p>
      <p><Link to="/admin/analytics">View analytics</Link></p>
    </>
  );
}
