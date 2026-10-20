import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import { formatErrorMessage } from "../utils/errorMessage.js";
import { newRequestKey } from "../utils/requestKey.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

export default function RepairWorkflow({
  complaintId,
  mode,
  status,
  compact = false,
  isOwner = false,
  assignedToCurrentUser = false,
  onUpdated,
}) {
  const [repairs, setRepairs] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [reason, setReason] = useState("");
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const objectUrls = useRef([]);
  const fileInput = useRef(null);
  const loadGeneration = useRef(0);

  useEffect(() => {
    if (!file || !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const loadRepairs = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setHistoryLoaded(false);
    setHistoryLoadFailed(false);
    setError("");
    try {
      const response = await api.get(`/complaints/${complaintId}/repairs`);
      const history = response.data || [];
      const nextUrls = {};
      const failures = [];

      for (const attempt of history) {
        for (const attachment of attempt.attachments || []) {
          try {
            const image = await api.get(
              `/complaints/${complaintId}/attachments/${attachment.id}/content`,
              { responseType: "blob" },
            );
            const imageUrl = URL.createObjectURL(image.data);
            if (generation === loadGeneration.current) {
              nextUrls[attachment.id] = imageUrl;
            } else {
              URL.revokeObjectURL(imageUrl);
            }
          } catch {
            if (generation === loadGeneration.current) {
              failures.push(attachment.filename || "repair image");
            }
          }
        }
      }

      if (generation !== loadGeneration.current) {
        Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = Object.values(nextUrls);
      setImageUrls(nextUrls);
      setRepairs(history);
      if (failures.length) {
        setHistoryLoadFailed(true);
        setError(`Could not load ${failures.join(", ")}. Refresh to try again.`);
      } else {
        setHistoryLoaded(true);
      }
    } catch (requestError) {
      if (generation === loadGeneration.current) {
        setHistoryLoadFailed(true);
        setError(formatErrorMessage(requestError, "Could not load repair history."));
      }
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    setRepairs([]);
    setImageUrls({});
    loadRepairs();
    return () => {
      loadGeneration.current += 1;
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [loadRepairs]);

  async function submitRepair(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (note.trim().length < 5) {
      setError("Enter a repair note of at least 5 characters.");
      return;
    }
    if (!file) {
      setError("Choose an after-repair photo.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a JPG, PNG, WEBP, or GIF image no larger than 5 MB.");
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append("note", note.trim());
      body.append("request_key", requestKey);
      body.append("file", file);
      await api.post(`/complaints/${complaintId}/repairs`, body);
      setNote("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setRequestKey(newRequestKey());
      setMessage("Repair evidence submitted for student verification.");
      await loadRepairs();
      await onUpdated?.();
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Repair evidence could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  async function verifyRepair(action) {
    setError("");
    setMessage("");
    if (action === "still_not_fixed" && reason.trim().length < 5) {
      setError("Explain what is still not fixed (at least 5 characters).");
      return;
    }
    if (action === "approve" && !window.confirm("Confirm that the problem has been fixed?")) return;

    setBusy(true);
    try {
      const response = await api.post(`/complaints/${complaintId}/verification`, {
        action,
        reason: action === "still_not_fixed" ? reason.trim() : null,
      });
      setMessage(response.data?.message || (
        action === "approve"
          ? "Repair approved; the complaint is complete."
          : "Complaint returned for further repair."
      ));
      setReason("");
      await onUpdated?.();
      await loadRepairs();
    } catch (requestError) {
      setError(formatErrorMessage(requestError, "Your verification could not be recorded."));
    } finally {
      setBusy(false);
    }
  }

  const canSubmitRepair = mode === "staff"
    && assignedToCurrentUser
    && ["Under Review", "In Progress"].includes(status);
  const latestRepair = repairs[repairs.length - 1];
  const hasValidRepairSubmission = Boolean(
    latestRepair
      && typeof latestRepair.note === "string"
      && latestRepair.note.trim()
      && Array.isArray(latestRepair.attachments)
      && latestRepair.attachments.some((attachment) => imageUrls[attachment.id]),
  );
  const canVerify = mode === "student"
    && isOwner
    && status === "Awaiting Verification"
    && !loading
    && historyLoaded
    && hasValidRepairSubmission;

  return (
    <section aria-busy={loading || busy} className={`space-y-4 ${compact ? "rounded-xl border border-slate-200 p-4" : "rounded-2xl border border-slate-200 bg-white p-5"}`}>
      <header>
        <h3 className="text-sm font-extrabold text-slate-800">{compact ? "Repair evidence" : "Repair evidence and verification"}</h3>
        {!compact && <p className="mt-1 text-[11px] text-slate-500">Every repair attempt and decision remains in the case history.</p>}
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          <p>{error}</p>
          {historyLoadFailed && (
            <button
              type="button"
              onClick={loadRepairs}
              disabled={loading}
              className="mt-2 rounded-md border border-rose-200 bg-white px-3 py-1.5 font-bold disabled:opacity-50"
            >
              {loading ? "Retrying..." : "Retry loading repair history"}
            </button>
          )}
        </div>
      )}
      {message && <p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</p>}

      {loading ? (
        <p role="status" aria-live="polite" className="text-xs text-slate-500">Loading repair history...</p>
      ) : historyLoadFailed ? null : repairs.length === 0 ? (
        compact && mode === "staff" ? null :
        <p className="text-xs text-slate-500">No repair submissions yet.</p>
      ) : (
        <ol className="space-y-3">
          {repairs.map((attempt, index) => (
            <li key={attempt.id} className="rounded-xl border border-slate-100 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs text-slate-800">Repair attempt {index + 1}</strong>
                <span className="text-[11px] text-slate-500">Submitted {formatDate(attempt.submitted_at)}</span>
              </div>
              {mode === "student" && status === "Awaiting Verification" && attempt.id === latestRepair?.id && (
                <p className="text-[11px] font-semibold text-amber-900">
                  Review by {attempt.review_deadline ? formatDate(attempt.review_deadline) : "deadline unavailable"}
                </p>
              )}
              <p className="whitespace-pre-wrap text-xs text-slate-700">{attempt.note}</p>
              <p className="text-[10px] text-slate-500">Submitted by {attempt.submitted_by?.name || "Staff"}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(attempt.attachments || []).map((attachment) => (
                  <figure key={attachment.id} className="rounded-lg bg-slate-50 p-2">
                    {imageUrls[attachment.id] ? (
                      <a
                        href={imageUrls[attachment.id]}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open after-repair evidence image: ${attachment.filename || "repair photo"} in a new tab`}
                        className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                      >
                        <img
                          src={imageUrls[attachment.id]}
                          alt={`After-repair evidence: ${attachment.filename || "repair photo"}. Open image in a new tab for a larger view.`}
                          className="max-h-64 w-full rounded-lg object-contain"
                        />
                      </a>
                    ) : (
                      <p className="p-4 text-xs text-slate-500">{attachment.filename || "Repair image"} is unavailable.</p>
                    )}
                    <figcaption className="mt-2 break-all text-[10px] text-slate-500">{attachment.filename}</figcaption>
                  </figure>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {mode === "student" && isOwner && status === "Awaiting Verification" && !loading && !historyLoadFailed && !canVerify && (
        <p role="status" className="text-xs font-semibold text-amber-800">
          Verification is unavailable because no complete repair submission with loaded photo evidence was found.
        </p>
      )}

      {mode === "staff" && !canSubmitRepair && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
          {!assignedToCurrentUser
            ? "Repair submission is unavailable because this complaint is not assigned to your account."
            : status === "Awaiting Verification"
              ? "Repair submission is unavailable while this complaint is awaiting student verification."
              : `Repair submission is unavailable for the current status${status ? ` (${status})` : ""}. Staff can submit repair evidence while a complaint is Under Review or In Progress.`}
        </p>
      )}

      {canSubmitRepair && (
        <form onSubmit={submitRepair} className="space-y-3 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-extrabold text-slate-800">Submit repair completion</h4>
          <label className="block text-xs font-semibold text-slate-700">
            Completion note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              minLength={5}
              maxLength={5000}
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            After-repair photo (required)
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              aria-describedby={`repair-photo-requirements-${complaintId}`}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-2 block w-full cursor-pointer rounded-lg border border-emerald-800/30 bg-white p-2 text-xs text-slate-700 shadow-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-emerald-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            />
            <span id={`repair-photo-requirements-${complaintId}`} className="mt-1 block text-[10px] font-medium text-slate-500">JPG, PNG, WEBP, or GIF · Maximum 5 MB</span>
          </label>
          {file && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="break-all text-xs font-semibold text-slate-700">Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
              {previewUrl && <img src={previewUrl} alt="Preview of selected after-repair photograph" className="max-h-56 w-full rounded-lg object-contain" />}
            </div>
          )}
          <button type="submit" disabled={busy} className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {busy ? "Submitting..." : "Submit for student verification"}
          </button>
        </form>
      )}

      {canVerify && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-extrabold text-slate-800">Verify the repair</h4>
          <button
            type="button"
            disabled={busy}
            onClick={() => verifyRepair("approve")}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Approve repair
          </button>
          <label className="block text-xs font-semibold text-slate-700">
            What is still not fixed? (required to request more repair)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={5}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => verifyRepair("still_not_fixed")}
            className="rounded-lg border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-50"
          >
            Reject repair and request rework
          </button>
        </div>
      )}
    </section>
  );
}
