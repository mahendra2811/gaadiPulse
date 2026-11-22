import { dateInZone, shiftDay } from "@/src/features/progress/schema";
import type { RecordEntry } from "@/src/features/records/schema";
import type { Observation } from "@/src/utils/meter";
import { measuredIntervals } from "@/src/utils/meter";
import { fuelIntervals, type FuelPoint } from "@/src/utils/fuelEconomy";
import { expenseAccounting } from "@/src/utils/expenseAccounting";
import type { InsightPeriod } from "./insightPeriods";
import {
  recordCurrency,
  recordMinorAmount,
} from "@/src/features/records/currency";
import type { CurrencyCode } from "@/src/utils/currency";

export type ReportKind =
  "fuel" | "expenses" | "meters" | "reminders" | "documents";
export type ReportRecord = RecordEntry & { kind: ReportKind };
export type ReportVehicle = {
  id: string;
  nickname: string | null;
  meter_mode: string;
  timezone: string;
};
export type ReportObservation = Observation & {
  entered_at?: string;
  source?: string;
};
export function reportBounds(period: InsightPeriod, today: string) {
  if (period === "all") return { start: null, end: null };
  if (period === "week") {
    const start = shiftDay(
      today,
      -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7),
    );
    return { start, end: shiftDay(start, 6) };
  }
  if (period === "month") {
    const start = `${today.slice(0, 7)}-01`;
    const days = new Date(
      Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
    ).getUTCDate();
    return { start, end: shiftDay(start, days - 1) };
  }
  return {
    start: `${today.slice(0, 4)}-01-01`,
    end: `${today.slice(0, 4)}-12-31`,
  };
}
export function recordTimestamp(row: ReportRecord) {
  return String(
    row.kind === "meters"
      ? (row.payload.reading_at ?? row.created_at)
      : (row.payload.event_at ?? row.created_at),
  );
}
export function buildReport({
  vehicle,
  period,
  generatedAt,
  records,
  observations,
  includedKinds,
  canReadMeters,
}: {
  vehicle: ReportVehicle;
  period: InsightPeriod;
  generatedAt: string;
  records: ReportRecord[];
  observations: ReportObservation[];
  includedKinds: ReportKind[];
  canReadMeters: boolean;
}) {
  const today = dateInZone(new Date(generatedAt), vehicle.timezone);
  const bounds = reportBounds(period, today);
  const contains = (timestamp: string) => {
    const date = dateInZone(new Date(timestamp), vehicle.timezone);
    return (
      (!bounds.start || date >= bounds.start) &&
      (!bounds.end || date <= bounds.end)
    );
  };
  const active = records.filter((row) => row.status !== "ARCHIVED");
  const selected = active
    .filter((row) => contains(recordTimestamp(row)))
    .sort(
      (a, b) =>
        recordTimestamp(a).localeCompare(recordTimestamp(b)) ||
        a.id.localeCompare(b.id),
    );
  const selectedObservations = observations
    .filter((row) => contains(row.observed_at))
    .sort(
      (a, b) =>
        a.observed_at.localeCompare(b.observed_at) || a.id.localeCompare(b.id),
    );
  const fuel = active.filter((row) => row.kind === "fuel");
  const fuelIntervalsInPeriod = canReadMeters
    ? fuelIntervals(
        fuel.map((row) => ({ id: row.id, ...row.payload }) as FuelPoint),
        observations,
      ).filter((interval) => contains(interval.to))
    : [];
  const measured = canReadMeters
    ? measuredIntervals(observations).filter((interval) =>
        contains(interval.to),
      )
    : [];
  const financial = selected.filter(
    (row) => row.kind === "fuel" || row.kind === "expenses",
  );
  const summaries: Partial<
    Record<
      CurrencyCode,
      {
        cash_minor: number;
        operating_minor: number;
        financing_minor: number;
        unclassified_minor: number;
      }
    >
  > = {};
  for (const row of financial) {
    const currency = recordCurrency(row.payload);
    const amount = recordMinorAmount(row.payload);
    const parts =
      row.kind === "fuel"
        ? { cash: amount, operating: amount, financing: 0, unclassified: 0 }
        : expenseAccounting(
            amount,
            String(row.payload.category),
            (row.payload.principal_minor as number | null | undefined) ??
              (row.payload.principal_paise as number | null | undefined) ??
              null,
            (row.payload.interest_minor as number | null | undefined) ??
              (row.payload.interest_paise as number | null | undefined) ??
              null,
          );
    const current = summaries[currency] ?? {
      cash_minor: 0,
      operating_minor: 0,
      financing_minor: 0,
      unclassified_minor: 0,
    };
    summaries[currency] = {
      cash_minor: current.cash_minor + parts.cash,
      operating_minor: current.operating_minor + parts.operating,
      financing_minor: current.financing_minor + parts.financing,
      unclassified_minor: current.unclassified_minor + parts.unclassified,
    };
  }
  const inr = summaries.INR ?? {
    cash_minor: 0,
    operating_minor: 0,
    financing_minor: 0,
    unclassified_minor: 0,
  };
  const summary = {
    cash_paise: inr.cash_minor,
    operating_paise: inr.operating_minor,
    financing_paise: inr.financing_minor,
    unclassified_paise: inr.unclassified_minor,
    record_count: selected.length,
  };
  const summaryByCurrency = Object.entries(summaries).map(
    ([currency_code, values]) => ({
      currency_code,
      ...values,
    }),
  );
  return {
    schema_version: 1,
    generated_at: generatedAt,
    vehicle: {
      id: vehicle.id,
      nickname: vehicle.nickname,
      meter_mode: vehicle.meter_mode,
      timezone: vehicle.timezone,
    },
    period: {
      selection: period,
      start_date: bounds.start,
      end_date: bounds.end,
      timezone: vehicle.timezone,
    },
    included_record_types: includedKinds,
    currency:
      summaryByCurrency.length === 1
        ? summaryByCurrency[0].currency_code
        : "MIXED",
    summary,
    summary_by_currency: summaryByCurrency,
    records: selected,
    meter_observations: selectedObservations,
    fuel_intervals: fuelIntervalsInPeriod,
    measured_intervals: measured,
    notes: [
      "Dates use the vehicle time zone. Reminders and documents without an event date are grouped by creation date.",
      "Fuel and measured intervals are included by their closing timestamp and may start before the selected period.",
      "Financial amounts are integer minor units grouped by currency. No exchange-rate conversion is applied. Only records available to this account are included.",
    ],
  };
}
export type Report = ReturnType<typeof buildReport>;
