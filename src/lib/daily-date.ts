import { formatInTimeZone } from "date-fns-tz";

export function getLocalDateKeyForInstant(
  instant: Date,
  timeZone: string,
): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

export function getTodayLocalDateKey(timeZone: string): string {
  return getLocalDateKeyForInstant(new Date(), timeZone);
}

export function isWithinDailySendWindow(
  instant: Date,
  timeZone: string,
  windowStartHour = 9,
  windowEndMinute = 14,
): boolean {
  const hour = Number(formatInTimeZone(instant, timeZone, "H"));
  const minute = Number(formatInTimeZone(instant, timeZone, "m"));
  if (hour !== windowStartHour) return false;
  return minute <= windowEndMinute;
}
