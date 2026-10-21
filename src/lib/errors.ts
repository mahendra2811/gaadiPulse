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
export function readableError(message: string) {
  if (/PERMISSION|FORBIDDEN|OWNER_REQUIRED/i.test(message))
    return t("permissionDenied");
  if (/EMAIL_NOT_VERIFIED/i.test(message)) return t("verify");
  if (/CONFLICT|VERSION|LEGACY_OPERATION/i.test(message))
    return t("recordConflict");
  if (
    /network|fetch failed|failed to fetch|offline|connection|timeout/i.test(
      message,
    )
  )
    return t("networkError");
  if (
    /violates|constraint|INVALID_|AMOUNT_INVALID|LINE_ITEMS|FUEL_VALUES|FIELD_RANGE|DATE_WINDOW/i.test(
      message,
    )
  )
    return t("invalidData");
  if (/ACCOUNT_DELETION_PENDING/i.test(message)) return t("deletionPending");
  if (/does not exist|schema cache|could not find the function/i.test(message))
    return t("serviceSetup");
  return message;
}
