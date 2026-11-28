import { en, t } from "@/src/lib/i18n";

export const recordCopy = new Proxy(en.records, {
  get: (_target, key) =>
    typeof key === "string"
      ? t(`records.${key}` as TranslationKeyPath)
      : undefined,
});
export function r(key: keyof typeof recordCopy) {
  if (key === "reminderHistory") return t("records.reminderHistory");
  return tRecord(key);
}
function tRecord(key: keyof typeof en.records) {
  return t(`records.${String(key)}` as TranslationKeyPath);
}
type TranslationKeyPath = `records.${keyof typeof en.records & string}`;
