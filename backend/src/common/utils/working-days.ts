/**
 * Working-day arithmetic for the returns window. Ghana is UTC+0 with no daylight saving,
 * so UTC calendar dates are local dates. Working days are Monday–Friday, excluding the
 * owner-maintained public holiday list (YYYY-MM-DD).
 */
const DAY = 86_400_000;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function isWorkingDay(d: Date, holidays: ReadonlySet<string>): boolean {
  const wd = d.getUTCDay();
  return wd >= 1 && wd <= 5 && !holidays.has(isoDate(d));
}

/**
 * End of the Nth working day after `start` (the day of `start` itself does not count).
 * Returns null when days <= 0 (item not returnable).
 */
export function workingDayDeadline(start: Date, days: number, holidays: Iterable<string>): Date | null {
  if (days <= 0) return null;
  const set = new Set(holidays);
  let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  let counted = 0;
  while (counted < days) {
    d = new Date(d.getTime() + DAY);
    if (isWorkingDay(d, set)) counted++;
  }
  return new Date(d.getTime() + DAY - 1); // 23:59:59.999 that day
}
