import { dateInZone } from "@/src/features/progress/schema";

export type SummaryPeriod = "week" | "month";
export type SummaryBounds = { start: string; end: string };

export function summaryBounds(
  timestamp: number,
  timezone: string,
  period: SummaryPeriod,
): SummaryBounds {
  const end = dateInZone(new Date(timestamp), timezone);
  if (period === "month") return { start: `${end.slice(0, 7)}-01`, end };

  const [year, month, day] = end.split("-").map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return { start: monday.toISOString().slice(0, 10), end };
}
