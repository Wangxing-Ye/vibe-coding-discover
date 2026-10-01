/** Catalog “Today” matches VIBECD claim days: UTC midnight to UTC midnight. */

export function startOfTodayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** @deprecated Use startOfTodayUtc. Kept so existing imports keep working. */
export function startOfTodayLocal(now = new Date()) {
  return startOfTodayUtc(now);
}

export function isSameUtcDay(value: Date, day = startOfTodayUtc()) {
  return (
    value.getUTCFullYear() === day.getUTCFullYear() &&
    value.getUTCMonth() === day.getUTCMonth() &&
    value.getUTCDate() === day.getUTCDate()
  );
}

export function formatUtcMmDdYyyy(date: Date) {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Parse `MM/DD/YYYY` (also `M/D/YYYY`) as a UTC calendar day. Empty or invalid → undefined. */
export function parseMmDdYyyyUtcDay(raw?: string) {
  const text = raw?.trim() ?? "";
  if (!text) return undefined;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return undefined;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) {
    return undefined;
  }
  return { start, end: new Date(Date.UTC(year, month - 1, day + 1)) };
}

/**
 * Parse `MM/DD/YYYY` as a local calendar day (same timezone as `formatUpdatedAt`).
 * Empty or invalid → undefined.
 */
export function parseMmDdYyyyLocalDay(raw?: string) {
  const text = raw?.trim() ?? "";
  if (!text) return undefined;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return undefined;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const start = new Date(year, month - 1, day);
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) {
    return undefined;
  }
  return { start, end: new Date(year, month - 1, day + 1) };
}
