import type { Report } from "./reportData";
import { moneyIn } from "@/src/utils/money";
import type { CurrencyCode } from "@/src/utils/currency";
import { t } from "@/src/lib/i18n";

const escape = (value: unknown): string => {
  const text =
    value == null
      ? "—"
      : typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);
  return text.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );
};
const label = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
function details(value: Record<string, unknown>) {
  return `<table><tbody>${Object.entries(value)
    .map(
      ([key, item]) =>
        `<tr><th>${escape(label(key))}</th><td>${escape(item)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}
function section(title: string, items: Record<string, unknown>[]) {
  return `<section><h2>${escape(title)} (${items.length})</h2>${items.length ? items.map((item, i) => `<div class="entry"><h3>${escape(title)} ${i + 1}</h3>${details(item)}</div>`).join("") : `<p>${escape(t("reportEmptyPeriod"))}</p>`}</section>`;
}
export function reportHtml(report: Report) {
  const period = report.period.start_date
    ? t("reportDateRange")
        .replace("{start}", report.period.start_date)
        .replace("{end}", report.period.end_date ?? report.period.start_date)
    : t("reportAllTime");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 18mm 14mm; } body { font: 10pt sans-serif; color: #17332d; } h1 { font-size: 22pt; } h2 { font-size: 15pt; margin-top: 20pt; } h3 { font-size: 11pt; margin: 10pt 0 4pt; } p, li { line-height: 1.4; } table { border-collapse: collapse; width: 100%; table-layout: fixed; } th, td { border: 1px solid #d5e2dd; padding: 5px 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; } th { width: 30%; background: #edf5f1; } tr { page-break-inside: avoid; } .entry { margin-bottom: 14pt; } .small { color: #4b625b; }
  </style></head><body><h1>${escape(t("reportDocumentTitle"))}</h1>${details({ [t("reportVehicle")]: report.vehicle.nickname || report.vehicle.id, [t("reportVehicleId")]: report.vehicle.id, [t("reportMeterMode")]: report.vehicle.meter_mode, [t("reportPeriod")]: period, [t("reportTimezone")]: report.period.timezone, [t("reportGeneratedAtUtc")]: report.generated_at, [t("reportIncludedTypes")]: report.included_record_types.join(", ") || t("reportNone") })}<h2>${escape(t("reportSummary"))}</h2>${details({ [t("reportSummaryRecords")]: report.summary.record_count, [t("reportCurrencies")]: report.summary_by_currency.map((summary) => summary.currency_code).join(", ") || t("reportNone") })}${report.summary_by_currency.map((summary) => `<h3>${escape(summary.currency_code)}</h3>${details({ [t("reportCashOutflow")]: moneyIn(summary.cash_minor, summary.currency_code as CurrencyCode), [t("reportOperatingCost")]: moneyIn(summary.operating_minor, summary.currency_code as CurrencyCode), [t("reportFinancing")]: moneyIn(summary.financing_minor, summary.currency_code as CurrencyCode), [t("reportUnclassified")]: moneyIn(summary.unclassified_minor, summary.currency_code as CurrencyCode) })}`).join("")}<ul class="small">${report.notes.map((note) => `<li>${escape(note)}</li>`).join("")}</ul>${section(
    t("reportSummaryRecords"),
    report.records.map(({ payload, ...meta }) => ({
      ...meta,
      ...Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
          `payload_${key}`,
          value,
        ]),
      ),
    })),
  )}${section(t("reportMeterObservations"), report.meter_observations)}${section(t("reportFuelIntervals"), report.fuel_intervals)}${section(t("reportMeasuredIntervals"), report.measured_intervals)}</body></html>`;
}
