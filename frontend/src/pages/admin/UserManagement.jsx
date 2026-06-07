import { useEffect, useState } from "react";
import api from "../../api/client";

const blank = { name: "", email: "", password: "password123", role: "staff", department: "Academic" };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");

  function load() {
    api.get("/users").then((res) => setUsers(res.data));
  }

  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/users", form);
      setForm(blank);
      load();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not create user");
    }
  }

  async function update(id, patch) {
    await api.patch(`/users/${id}`, patch);
    load();
  }

  async function remove(id) {
    await api.delete(`/users/${id}`);
    load();
  }

  return (
    <>
      <h1>User Management</h1>
      <form onSubmit={create}>
        <h2>Create User</h2>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {["student", "staff", "admin"].map((role) => <option key={role}>{role}</option>)}
        </select>
        <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          {["Academic", "Discipline", "Infrastructure", "Transport", "Administration"].map((d) => <option key={d}>{d}</option>)}
        </select>
        <button>Create</button>
        {message && <p className="error">{message}</p>}
      </form>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                  {["student", "staff", "admin"].map((role) => <option key={role}>{role}</option>)}
                </select>
              </td>
              <td>
                <select value={u.department || ""} onChange={(e) => update(u.id, { department: e.target.value || null })}>
                  <option value="">None</option>
                  {["Academic", "Discipline", "Infrastructure", "Transport", "Administration"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </td>
              <td><button onClick={() => remove(u.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
