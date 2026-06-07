import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", department: "Academic" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  }

  return (
    <div className="auth">
      <h1>Student Registration</h1>
      <form onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          {["Academic", "Discipline", "Infrastructure", "Transport", "Administration"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {error && <p className="error">{error}</p>}
        <button>Register</button>
      </form>
      <p><Link to="/login">Back to login</Link></p>
    </div>
  );
}
