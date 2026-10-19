export function formatErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (!item || typeof item !== "object" || typeof item.msg !== "string") return "";

        const location = Array.isArray(item.loc)
          ? item.loc.filter((part) => typeof part === "string" && part !== "body").join(".")
          : "";
        return location ? `${location}: ${item.msg}` : item.msg;
      })
      .filter(Boolean);

    if (messages.length) return [...new Set(messages)].join("; ");
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
