import { Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";

export { csvCell, recordsCsv } from "./csv";

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
export async function exportPdf(html: string) {
  const Print = await import("expo-print");
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Sharing is unavailable on this device. Try JSON or CSV export.",
    );
  const file = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });
}
