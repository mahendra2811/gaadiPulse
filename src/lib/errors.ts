import { ZodError } from "zod";
import { t } from "./i18n";
export function errorMessage(value: unknown): string {
  if (value instanceof ZodError)
    return value.issues[0]?.message ?? t("invalidData");
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
  if (/VEHICLE_ARCHIVED/i.test(message)) return t("archivedVehicleReadOnly");
  if (/ARCHIVE_ADMINISTERED_VEHICLES_FIRST/i.test(message))
    return t("deletionArchiveFirst");
  if (/METER_ABOVE_NEXT/i.test(message)) return t("readingAboveNextServer");
  if (/METER_BELOW_PREVIOUS|METER_RESET_NOT_ALLOWED/i.test(message))
    return t("readingBelowPreviousServer");
  if (/INVALID_OPERATION|SAVE_NOT_CONFIRMED/i.test(message))
    return t("saveUnconfirmed");
  if (/VEHICLE_FUEL_MISMATCH|FUEL_UNIT_INVALID/i.test(message))
    return t("fuelMismatch");
  if (/PERMISSION|FORBIDDEN|OWNER_REQUIRED/i.test(message))
    return t("permissionDenied");
  if (/EMAIL_NOT_VERIFIED/i.test(message)) return t("verify");
  if (/CONFLICT|VERSION|LEGACY_OPERATION/i.test(message))
    return t("recordConflict");
  if (
    /network|fetch failed|failed to fetch|offline|connection|timeout|aborted|timed out/i.test(
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
