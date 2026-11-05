export function csvCell(value: unknown) {
  const raw =
    typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  const safe =
    typeof value !== "number" && /^[\s\uFEFF]*[=+\-@]|^[\t\r]/.test(raw)
      ? `'${raw}`
      : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function recordsCsv(
  records: {
    kind: string;
    id: string;
    payload: Record<string, unknown>;
    created_at: string;
    status: string;
  }[],
) {
  return [
    "kind,id,event_at,title,amount_paise,quantity,unit,status,recorded_at,payload",
    ...records.map((row) =>
      [
        row.kind,
        row.id,
        row.payload.event_at ?? row.payload.progress_date,
        row.payload.title,
        row.payload.amount_paise,
        row.payload.quantity,
        row.payload.unit,
        row.status,
        row.created_at,
        row.payload,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}

/** A single rectangular, filterable table. Nested record fields retain their JSON value. */
export function reportCsv(report: import("./reportData").Report) {
  const rows: Record<string, unknown>[] = [];
  const context = {
    period: report.period.selection,
    period_start: report.period.start_date,
    period_end: report.period.end_date,
    timezone: report.period.timezone,
    generated_at: report.generated_at,
    vehicle_id: report.vehicle.id,
    currency: report.currency,
  };
  rows.push({
    row_type: "summary",
    ...context,
    ...report.summary,
    included_record_types: report.included_record_types,
  });
  for (const record of report.records) {
    const { payload, ...metadata } = record;
    rows.push({
      row_type: "record",
      ...context,
      ...metadata,
      ...Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
          `payload_${key}`,
          value,
        ]),
      ),
    });
  }
  for (const observation of report.meter_observations)
    rows.push({ row_type: "meter_observation", ...context, ...observation });
  for (const interval of report.fuel_intervals)
    rows.push({ row_type: "fuel_interval", ...context, ...interval });
  for (const interval of report.measured_intervals)
    rows.push({ row_type: "measured_interval", ...context, ...interval });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(","),
    ),
  ].join("\r\n");
}
