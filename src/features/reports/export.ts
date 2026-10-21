import { Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";

export function csvCell(value: unknown) {
  const raw =
    typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
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
export async function exportText(text: string, filename: string, mime: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(text);
  const Sharing = await import("expo-sharing");
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file.uri, {
      mimeType: mime,
      dialogTitle: filename,
    });
  else await Share.share({ message: text, title: filename });
}
export async function exportPdf(title: string, lines: string[]) {
  const Print = await import("expo-print");
  const Sharing = await import("expo-sharing");
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch]!,
    );
  const html = `<html><head><meta charset="utf-8"/><style>body{font-family:sans-serif;color:#122c2a;padding:30px}li{margin:10px 0}</style></head><body><h1>${escape(title)}</h1><ul>${lines.map((s) => `<li>${escape(s)}</li>`).join("")}</ul></body></html>`;
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const file = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
}
