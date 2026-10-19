import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import RepairWorkflow from "../../components/RepairWorkflow.jsx";
import { formatErrorMessage } from "../../utils/errorMessage.js";

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function newRequestKey() {
  return crypto.randomUUID();
}

export default function VerificationReview() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reminderRequestKey, setReminderRequestKey] = useState(newRequestKey);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    let reminderScanError = "";
    try {
      await api.post("/complaints/admin/verification/process-reminders");
    } catch (requestError) {
      reminderScanError = formatErrorMessage(requestError, "Could not process verification reminders.");
    }

    try {
      const response = await api.get("/complaints/admin/verification");
      const queue = response.data || [];
      setItems(queue);
      setSelected((current) => queue.find((item) => item.id === current?.id) || null);
      if (reminderScanError) setError(`Reminder scan failed: ${reminderScanError}`);
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Could not load the verification review queue."));
      setItems([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openReview(item) {
    setSelected(item);
    setReason("");
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api.post(`/complaints/admin/verification/${item.id}/review`);
      setMessage("Administrator review recorded.");
      await load();
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Could not record the administrator review."));
    } finally {
      setBusy(false);
    }
  }

  async function sendReminder() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post(
        `/complaints/admin/verification/${selected.id}/remind`,
        { request_key: reminderRequestKey },
      );
      setReminderRequestKey(newRequestKey());
      setMessage(response.data?.sent
        ? "A verification reminder was sent to the student."
        : "This reminder request had already been processed.");
      await load();
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Could not send the reminder."));
    } finally {
      setBusy(false);
    }
  }

  async function returnForRepair() {
    if (!selected) return;
    if (reason.trim().length < 5) {
      setError("Enter a reason of at least 5 characters before returning the complaint.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post(`/complaints/admin/verification/${selected.id}/return`, { reason: reason.trim() });
      setMessage("Complaint returned to the assigned employee for further repair.");
      setReason("");
      await load();
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Could not return the complaint."));
    } finally {
      setBusy(false);
    }
  }

  async function closeAfterNonresponse() {
    if (!selected) return;
    if (reason.trim().length < 10) {
      setError("Enter a reason of at least 10 characters before administrative closure.");
      return;
    }
    if (!window.confirm("This closes the complaint as an administrator decision, not student approval. Continue?")) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post(`/complaints/admin/verification/${selected.id}/close`, {
        confirmed: true,
        reason: reason.trim(),
      });
      setMessage("Complaint administratively closed after non-response. This was not student approval.");
      setReason("");
      await load();
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Could not close the complaint."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Verification review</h1>
          <p className="mt-1 text-sm text-slate-500">Review repair evidence for complaints awaiting student verification.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
          {loading ? "Refreshing..." : "Refresh queue"}
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-extrabold text-slate-800">Awaiting verification ({items.length})</h2>
          {loading && items.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Loading review queue...</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No complaints are awaiting verification.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openReview(item)}
                    aria-current={selected?.id === item.id ? "true" : undefined}
                    className={`w-full rounded-xl border p-3 text-left ${selected?.id === item.id ? "border-emerald-700 bg-emerald-50" : "border-slate-100 hover:bg-slate-50"}`}
                  >
                    <span className="block text-xs font-extrabold text-slate-800">#{item.id} {item.title}</span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      Student: {item.creator?.name || "Unknown"} · Staff: {item.assignee?.name || "Unassigned"}
                    </span>
                    <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${item.overdue ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>
                      {item.overdue ? "Review overdue" : `${item.age_hours} hours awaiting review`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          {!selected ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Select a complaint to inspect its repair evidence and timeline.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Complaint #{selected.id}</p>
                    <h2 className="mt-1 text-lg font-extrabold text-slate-900">{selected.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{selected.description}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-900">{selected.status}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="text-xs text-slate-600"><strong>Student:</strong> {selected.creator?.name || "Unknown"}</p>
                  <p className="text-xs text-slate-600"><strong>Assigned staff:</strong> {selected.assignee?.name || "Unassigned"}</p>
                  <p className="text-xs text-slate-600"><strong>Submitted:</strong> {formatDate(selected.created_at)}</p>
                  <p className="text-xs text-slate-600"><strong>Latest repair:</strong> {selected.latest_repair?.submitted_at ? formatDate(selected.latest_repair.submitted_at) : "None"}</p>
                </div>
              </div>

              <RepairWorkflow complaintId={selected.id} mode="admin" status={selected.status} />

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-extrabold text-slate-800">Complaint timeline</h3>
                {selected.timeline?.length ? (
                  <ol className="mt-4 space-y-4">
                    {selected.timeline.map((event) => (
                      <li key={event.id} className="border-l-2 border-emerald-200 pl-3">
                        <p className="text-xs font-semibold text-slate-700">{event.message}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatDate(event.created_at)}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-3 text-xs text-slate-500">No timeline entries are available.</p>}

                <h3 className="mt-6 text-sm font-extrabold text-slate-800">Reminder and review history</h3>
                {selected.reminder_history?.length ? (
                  <ol className="mt-3 space-y-3">
                    {selected.reminder_history.map((event, index) => (
                      <li key={`${event.event_type}-${event.created_at}-${index}`} className="border-l-2 border-slate-200 pl-3">
                        <p className="text-xs font-semibold text-slate-700">{event.message}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatDate(event.created_at)}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-2 text-xs text-slate-500">No reminder or review events recorded yet.</p>}
                <button type="button" onClick={sendReminder} disabled={busy} className="mt-4 rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50">
                  Send another student reminder
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Reason (required for either action)
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={returnForRepair} disabled={busy} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    Return to employee for repair
                  </button>
                  <button type="button" onClick={closeAfterNonresponse} disabled={busy} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">
                    Administratively close after non-response
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Closure requires a reason of at least 10 characters and a second confirmation. It is recorded as an administrator decision, never student approval.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
