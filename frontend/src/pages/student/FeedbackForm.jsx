import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";

export default function FeedbackForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ complaint_id: Number(id), rating: 5, comment: "" });
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/feedback", form);
      navigate(`/complaints/${id}`);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not submit feedback");
    }
  }

  return (
    <>
      <h1>Submit Feedback</h1>
      <form onSubmit={submit}>
        <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <textarea placeholder="Comment" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        {message && <p className="error">{message}</p>}
        <button>Submit Feedback</button>
      </form>
    </>
  );
}
