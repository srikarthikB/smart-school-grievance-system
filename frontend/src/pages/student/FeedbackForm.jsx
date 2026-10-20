import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";

export default function FeedbackForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ complaint_id: Number(id), rating: 5, comment: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      await api.post("/feedback", form);
      navigate(`/complaints/${id}`);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Submit Feedback</h1>
      <form onSubmit={submit} aria-busy={submitting}>
        <label htmlFor="feedback-rating">Rating</label>
        <select
          id="feedback-rating"
          name="rating"
          value={form.rating}
          onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          aria-describedby="feedback-rating-help"
          disabled={submitting}
        >
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <p id="feedback-rating-help">Choose a rating from 1 to 5.</p>
        {submitting && <p role="status" aria-live="polite">Submitting feedback…</p>}
        <label htmlFor="feedback-comment">Comment (optional)</label>
        <textarea
          id="feedback-comment"
          name="comment"
          placeholder="Comment"
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          disabled={submitting}
        />
        {message && <p className="error" role="alert" aria-live="assertive">{message}</p>}
        <button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Submitting feedback…" : "Submit Feedback"}
        </button>
      </form>
    </>
  );
}
