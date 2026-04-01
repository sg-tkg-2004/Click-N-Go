/**
 * Canonical local calendar date as YYYY-MM-DD (matches <input type="date" /> value).
 * Use for comparing user-selected dates to API timestamps without mixing UTC calendar days.
 */
export function normalizeLocalDateKey(isoOrDate) {
  const d = typeof isoOrDate === "string" || typeof isoOrDate === "number" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalDateKey() {
  return normalizeLocalDateKey(new Date());
}
