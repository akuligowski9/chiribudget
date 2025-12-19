export function yyyyMm(dateStr) {
  // dateStr: YYYY-MM-DD
  return (dateStr || "").slice(0, 7);
}

export function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export function normalizeDesc(s) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function toastId() {
  return Math.random().toString(36).slice(2);
}
