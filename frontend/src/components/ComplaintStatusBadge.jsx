const STATUS_PRESENTATION = {
  submitted: {
    label: "Submitted",
    classes: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  "under review": {
    label: "Under Review",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
  },
  "in progress": {
    label: "In Progress",
    classes: "border-rose-200 bg-rose-50 text-rose-800",
    dot: "bg-rose-600",
  },
  "awaiting verification": {
    label: "Awaiting Verification",
    classes: "border-amber-200 bg-amber-50 text-amber-900",
    dot: "bg-amber-600",
  },
  rejected: {
    label: "Rejected",
    classes: "border-rose-200 bg-rose-50 text-rose-800",
    dot: "bg-rose-600",
  },
  resolved: {
    label: "Resolved",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
  },
};

function normalizeStatus(status) {
  return String(status || "Submitted")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export default function ComplaintStatusBadge({ status, className = "" }) {
  const normalized = normalizeStatus(status);
  const presentation = STATUS_PRESENTATION[normalized] || {
    label: String(status || "Submitted").trim() || "Submitted",
    classes: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold leading-4 tracking-wide ${presentation.classes} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${presentation.dot}`} />
      {presentation.label}
    </span>
  );
}
