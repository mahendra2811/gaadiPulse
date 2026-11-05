import { dateInZone, shiftDay } from "@/src/features/progress/schema";

/** Keep cached pilot views within the same two local dates enforced by RLS. */
export function isPilotHistoryVisible(
  timestamp: string,
  timezone: string,
  now: number,
) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return false;
  const today = dateInZone(new Date(now), timezone);
  const observed = /^\d{4}-\d{2}-\d{2}$/.test(timestamp)
    ? timestamp
    : dateInZone(date, timezone);
  return observed >= shiftDay(today, -1) && observed <= today;
}
