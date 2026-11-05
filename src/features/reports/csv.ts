export function csvCell(value: unknown) {
  const raw =
    typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r]/.test(raw) ? `'${raw}` : raw;
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
