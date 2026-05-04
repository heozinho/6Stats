/**
 * Returns the UTC timestamp for midnight (start of day) in the given IANA timezone.
 * Works in Cloudflare Workers (runtime is always UTC).
 *
 * Strategy: take current UTC time, subtract however many ms have elapsed
 * since midnight *in the user's timezone* → gives UTC midnight for that local day.
 */
export function getStartOfDayUTC(tz: string, date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parseInt(parts.find(p => p.type === type)?.value ?? '0');

  const h = get('hour') === 24 ? 0 : get('hour');
  const m = get('minute');
  const s = get('second');
  const msIntoDay = (h * 3600 + m * 60 + s) * 1000 + date.getMilliseconds();

  return new Date(date.getTime() - msIntoDay);
}

/** Start of next local day (= end of today) */
export function getEndOfDayUTC(tz: string, date = new Date()): Date {
  const start = getStartOfDayUTC(tz, date);
  return new Date(start.getTime() + 86_400_000);
}

/** Monday midnight of the current local week */
export function getStartOfWeekUTC(tz: string, date = new Date()): Date {
  const start = getStartOfDayUTC(tz, date);

  // What day of week is it locally?
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  const dayMap: Record<string, number> = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  const daysFromMonday = dayMap[dayName] ?? 0;

  return new Date(start.getTime() - daysFromMonday * 86_400_000);
}
