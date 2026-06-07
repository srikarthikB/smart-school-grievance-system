import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const staff = useMemo(() => users.filter((u) => u.role === "staff"), [users]);

  function load() {
    api.get("/complaints").then((res) => setComplaints(res.data));
    api.get("/users").then((res) => setUsers(res.data));
  }

  useEffect(load, []);

  async function assign(id, staffId) {
    if (!staffId) return;
    await api.patch(`/complaints/${id}/assign`, { staff_id: Number(staffId) });
    load();
  }

  async function update(id, patch) {
    await api.patch(`/complaints/${id}`, patch);
    load();
  }

  return (
    <>
      <h1>Complaint Management</h1>
      <table>
        <thead>
          <tr><th>Title</th><th>Student</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td>{c.creator?.name || "Unknown"} {c.is_anonymous ? "(anonymous to staff)" : ""}</td>
              <td>{c.category}</td>
              <td>
                <select value={c.priority} onChange={(e) => update(c.id, { priority: e.target.value })}>
                  {["Low", "Medium", "High"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </td>
              <td>
                <select value={c.status} onChange={(e) => update(c.id, { status: e.target.value })}>
                  {["Submitted", "Under Review", "In Progress", "Resolved", "Rejected"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <select value={c.assigned_to || ""} onChange={(e) => assign(c.id, e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.map((u) => <option key={u.id} value={u.id}>{u.name} - {u.department}</option>)}
                </select>
              </td>
              <td><Link to={`/complaints/${c.id}`}>Details</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
