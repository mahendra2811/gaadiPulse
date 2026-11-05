import { dateInZone, shiftDay } from "@/src/features/progress/schema";
import type { FuelInterval } from "@/src/utils/fuelEconomy";

export type InsightPeriod = "week" | "month" | "year" | "all";
export type Bucket = { key: string; label: string; description: string };

export function insightBuckets(
  period: InsightPeriod,
  today: string,
  dates: string[],
): Bucket[] {
  if (period === "week") {
    const monday = shiftDay(
      today,
      -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7),
    );
    return Array.from({ length: 7 }, (_, i) => {
      const key = shiftDay(monday, i);
      const date = new Date(`${key}T12:00:00Z`);
      return {
        key,
        label: date.toLocaleDateString("en-GB", {
          weekday: "short",
          timeZone: "UTC",
        }),
        description: date.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      };
    });
  }
  if (period === "month") {
    const first = `${today.slice(0, 7)}-01`;
    const count = new Date(
      Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
    ).getUTCDate();
    return Array.from({ length: count }, (_, i) => {
      const key = shiftDay(first, i);
      return {
        key,
        label: String(i + 1),
        description: new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      };
    });
  }
  if (period === "year")
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${today.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`;
      const description = new Date(`${key}-01T12:00:00Z`).toLocaleDateString(
        "en-GB",
        { month: "long", year: "numeric", timeZone: "UTC" },
      );
      return { key, label: description.slice(0, 3), description };
    });
  const years = [
    ...new Set(
      dates
        .map((date) => date.slice(0, 4))
        .filter((year) => /^\d{4}$/.test(year)),
    ),
  ].sort();
  return years.map((key) => ({ key, label: key, description: key }));
}

export function bucketKey(
  timestamp: string,
  zone: string,
  period: InsightPeriod,
): string {
  const date = dateInZone(new Date(timestamp), zone);
  return period === "year"
    ? date.slice(0, 7)
    : period === "all"
      ? date.slice(0, 4)
      : date;
}

export function efficiencyAverage(
  intervals: FuelInterval[],
  metric: "distance" | "hours",
): number | null {
  const valid = intervals.filter((item) =>
    metric === "distance"
      ? item.kmPerUnit !== null
      : item.unitsPerHour !== null,
  );
  if (!valid.length) return null;
  const quantity = valid.reduce((sum, item) => sum + item.quantity, 0);
  const measured = valid.reduce(
    (sum, item) => sum + (metric === "distance" ? item.distance! : item.hours!),
    0,
  );
  return metric === "distance" ? measured / quantity : quantity / measured;
}
