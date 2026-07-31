/** Add N business days (Mon-Fri) to a date. */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

/** Count business days elapsed between two dates (exclusive of start day). */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** Whole calendar days since a date (>= 0). */
export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const then = new Date(date).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

/** Number of business days a job should sit in "applied" before a nudge. */
export const FOLLOW_UP_BUSINESS_DAYS = 10;
