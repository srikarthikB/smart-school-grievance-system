import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState("Under Review");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    api.get(`/complaints/${id}`).then((res) => {
      setComplaint(res.data);
      setStatus(res.data.status);
      setNotes(res.data.resolution_notes || "");
    });
    api.get(`/feedback/${id}`).then((res) => setFeedback(res.data)).catch(() => setFeedback(null));
  }

  useEffect(load, [id]);

  async function updateStatus(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.patch(`/complaints/${id}/status`, { status, resolution_notes: notes });
      setMessage("Updated");
      load();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Update failed");
    }
  }

  if (!complaint) return <p>Loading...</p>;

  return (
    <>
      <h1>{complaint.title}</h1>
      <p><strong>Status:</strong> {complaint.status}</p>
      <p><strong>Category:</strong> {complaint.category}</p>
      <p><strong>Priority:</strong> {complaint.priority}</p>
      <p><strong>Anonymous:</strong> {complaint.is_anonymous ? "Yes" : "No"}</p>
      {complaint.creator && <p><strong>Created by:</strong> {complaint.creator.name} ({complaint.creator.email})</p>}
      <p><strong>Assigned to:</strong> {complaint.assignee?.name || "Unassigned"}</p>
      <p>{complaint.description}</p>
      <p><strong>Resolution notes:</strong> {complaint.resolution_notes || "None"}</p>

      {(user.role === "staff" || user.role === "admin") && (
        <form onSubmit={updateStatus}>
          <h2>Update Status</h2>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resolution notes" />
          <button>Save</button>
          {message && <p>{message}</p>}
        </form>
      )}

      <h2>Feedback</h2>
      {feedback ? <p>Rating: {feedback.rating}/5 - {feedback.comment}</p> : <p>No feedback submitted.</p>}
    </>
  );
}
