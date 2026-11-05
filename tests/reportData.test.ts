import { describe, expect, it } from "vitest";
import {
  buildReport,
  reportBounds,
  type ReportRecord,
} from "@/src/features/reports/reportData";
import { reportCsv } from "@/src/features/reports/csv";
import { reportHtml } from "@/src/features/reports/reportHtml";
const vehicle = {
  id: "v1",
  nickname: "<Truck>",
  meter_mode: "KM",
  timezone: "Asia/Kolkata",
};
const row = (
  id: string,
  kind: ReportRecord["kind"],
  event: string,
  payload: Record<string, unknown> = {},
): ReportRecord => ({
  id,
  kind,
  vehicle_id: "v1",
  created_by: "u1",
  revision: 1,
  status: "ACTIVE",
  created_at: event,
  updated_at: event,
  payload: { event_at: event, ...payload },
});
const full = (km: number, quantity: number) => ({
  km,
  hours: null,
  reading_at: km === 100 ? "2026-03-30T09:00:00Z" : "2026-04-02T09:00:00Z",
  quantity,
  unit: "L",
  energy_type: "DIESEL",
  is_full_tank: true,
  amount_paise: 10000,
});
const records = [
  row("a", "fuel", "2026-03-30T09:00:00Z", full(100, 10)),
  row("b", "fuel", "2026-04-02T09:00:00Z", full(300, 20)),
  row("c", "expenses", "2026-04-05T09:00:00Z", {
    title: "=unsafe",
    category: "SERVICE",
    amount_paise: 5000,
    notes: "<script>\nline",
  }),
  row("future", "expenses", "2026-05-01T09:00:00Z", { amount_paise: 100000 }),
];
const observations = [
  {
    id: "one",
    reading_type: "KM" as const,
    value: 100,
    observed_at: "2026-03-30T09:00:00Z",
  },
  {
    id: "two",
    reading_type: "KM" as const,
    value: 300,
    observed_at: "2026-04-02T09:00:00Z",
  },
];
function sample(canReadMeters = true) {
  return buildReport({
    vehicle,
    period: "month",
    generatedAt: "2026-04-10T00:00:00Z",
    records,
    observations: canReadMeters ? observations : [],
    includedKinds: ["fuel", "expenses"],
    canReadMeters,
  });
}
describe("report dataset and exports", () => {
  it("uses bounded calendar periods including year rollover", () => {
    expect(reportBounds("week", "2026-01-01")).toEqual({
      start: "2025-12-29",
      end: "2026-01-04",
    });
    expect(reportBounds("month", "2024-02-10").end).toBe("2024-02-29");
    expect(reportBounds("all", "2024-02-10")).toEqual({
      start: null,
      end: null,
    });
  });
  it("includes cross-boundary intervals by closing date without including out-of-period records", () => {
    const report = sample();
    expect(report.records.map((r) => r.id)).toEqual(["b", "c"]);
    expect(report.summary.cash_paise).toBe(15000);
    expect(report.fuel_intervals[0].kmPerUnit).toBe(10);
    expect(report.measured_intervals[0].delta).toBe(200);
    expect(report.meter_observations.map((x) => x.id)).toEqual(["two"]);
    expect(sample(false).fuel_intervals).toEqual([]);
  });
  it("exposes fields for analysis, protects formulas and escapes PDF content", () => {
    const csv = reportCsv(sample());
    expect(csv).toContain('"payload_title"');
    expect(csv).toContain('"\'=unsafe"');
    expect(csv).toContain('"fuel_interval"');
    expect(csv).toContain('"meter_observation"');
    const html = reportHtml(sample());
    expect(html).toContain("&lt;Truck&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Fuel intervals (1)");
    expect(html).toContain("150.00");
  });
});
