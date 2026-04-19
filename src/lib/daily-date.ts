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
