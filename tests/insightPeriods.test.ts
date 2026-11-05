import { describe, expect, it } from "vitest";
import {
  bucketKey,
  efficiencyAverage,
  insightBuckets,
} from "@/src/features/reports/insightPeriods";
import type { FuelInterval } from "@/src/utils/fuelEconomy";

describe("insight periods", () => {
  it("uses Monday to Sunday, including year boundaries", () => {
    const buckets = insightBuckets("week", "2026-01-01", []);
    expect(buckets.map((x) => x.key)).toEqual([
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(buckets.map((x) => x.label)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
  it("includes the entire month and uses the vehicle time zone", () => {
    expect(insightBuckets("month", "2024-02-10", [])).toHaveLength(29);
    expect(insightBuckets("month", "2026-05-01", [])).toHaveLength(31);
    expect(bucketKey("2026-04-30T20:00:00Z", "Asia/Kolkata", "month")).toBe(
      "2026-05-01",
    );
    expect(
      insightBuckets("all", "2026-05-01", [
        "2024-01-01",
        "2026-02-02",
        "2024-02-01",
      ]).map((x) => x.key),
    ).toEqual(["2024", "2026"]);
  });
  it("weights efficiency by measured distance, fuel and hours", () => {
    const interval = (
      distance: number,
      quantity: number,
      hours: number,
    ): FuelInterval => ({
      from: "2026-01-01",
      to: "2026-01-02",
      distance,
      quantity,
      hours,
      unit: "L",
      kmPerUnit: distance / quantity,
      unitsPerHour: quantity / hours,
      costPerKm: null,
    });
    const rows = [interval(100, 10, 5), interval(100, 20, 10)];
    expect(efficiencyAverage(rows, "distance")).toBeCloseTo(200 / 30);
    expect(efficiencyAverage(rows, "hours")).toBe(2);
    expect(efficiencyAverage([], "distance")).toBeNull();
  });
});
