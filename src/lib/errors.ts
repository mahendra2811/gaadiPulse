import { t } from "./i18n";
export function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  )
    return value.message;
  return t("error");
}
