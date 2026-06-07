import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get("/complaints/mine").then((res) => setComplaints(res.data));
  }, []);

  return (
    <>
      <h1>My Complaints</h1>
      <ComplaintTable complaints={complaints} showFeedback />
    </>
  );
}

export function ComplaintTable({ complaints, showFeedback }) {
  return (
    <table>
      <thead>
        <tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {complaints.map((c) => (
          <tr key={c.id}>
            <td>{c.title}</td>
            <td>{c.category}</td>
            <td>{c.priority}</td>
            <td>{c.status}</td>
            <td>{c.assignee?.name || "Unassigned"}</td>
            <td className="actions">
              <Link to={`/complaints/${c.id}`}>Details</Link>
              {showFeedback && c.status === "Resolved" && <Link to={`/student/complaints/${c.id}/feedback`}>Feedback</Link>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
