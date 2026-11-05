import type { Report } from "./reportData";
import { money } from "@/src/utils/money";

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
  return `<section><h2>${escape(title)} (${items.length})</h2>${items.length ? items.map((item, i) => `<div class="entry"><h3>${escape(title)} ${i + 1}</h3>${details(item)}</div>`).join("") : "<p>None in this period.</p>"}</section>`;
}
export function reportHtml(report: Report) {
  const period = report.period.start_date
    ? `${report.period.start_date} to ${report.period.end_date}`
    : "All time";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 18mm 14mm; } body { font: 10pt sans-serif; color: #17332d; } h1 { font-size: 22pt; } h2 { font-size: 15pt; margin-top: 20pt; } h3 { font-size: 11pt; margin: 10pt 0 4pt; } p, li { line-height: 1.4; } table { border-collapse: collapse; width: 100%; table-layout: fixed; } th, td { border: 1px solid #d5e2dd; padding: 5px 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; } th { width: 30%; background: #edf5f1; } tr { page-break-inside: avoid; } .entry { margin-bottom: 14pt; } .small { color: #4b625b; }
  </style></head><body><h1>GaadiPulse report</h1>${details({ vehicle: report.vehicle.nickname || report.vehicle.id, "Vehicle ID": report.vehicle.id, "Meter mode": report.vehicle.meter_mode, period, timezone: report.period.timezone, "Generated at (UTC)": report.generated_at, "Included record types": report.included_record_types.join(", ") || "None" })}<h2>Summary</h2>${details({ "Cash outflow": money(report.summary.cash_paise), "Operating cost": money(report.summary.operating_paise), Financing: money(report.summary.financing_paise), Unclassified: money(report.summary.unclassified_paise), Records: report.summary.record_count })}<ul class="small">${report.notes.map((note) => `<li>${escape(note)}</li>`).join("")}</ul>${section(
    "Records",
    report.records.map(({ payload, ...meta }) => ({
      ...meta,
      ...Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
          `payload_${key}`,
          value,
        ]),
      ),
    })),
  )}${section("Meter observations", report.meter_observations)}${section("Fuel intervals", report.fuel_intervals)}${section("Measured intervals", report.measured_intervals)}</body></html>`;
}
