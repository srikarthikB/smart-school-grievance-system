import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function CreateComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Academic",
    priority: "Medium",
    is_anonymous: false,
  });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/complaints", form);
      navigate("/student/complaints");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create complaint");
    }
  }

  return (
    <>
      <h1>Create Complaint</h1>
      <form onSubmit={submit}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {["Academic", "Faculty", "Student", "Infrastructure", "Transport", "Administration", "Other"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {["Low", "Medium", "High"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <label>
          <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
          Submit anonymously to assigned staff
        </label>
        {error && <p className="error">{error}</p>}
        <button>Submit</button>
      </form>
    </>
  );
}
