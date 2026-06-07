import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";

export default function StudentDashboard() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get("/complaints/mine").then((res) => setComplaints(res.data));
  }, []);

  return (
    <>
      <h1>Student Dashboard</h1>
      <p>Total complaints: {complaints.length}</p>
      <p>Resolved: {complaints.filter((c) => c.status === "Resolved").length}</p>
      <p><Link to="/student/create">Submit a complaint</Link></p>
    </>
  );
}
