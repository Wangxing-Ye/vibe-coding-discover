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
