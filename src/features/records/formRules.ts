import { z } from "zod";
import type { EntryForm, Kind, Payload } from "./schema";
import { t } from "@/src/lib/i18n";
import { domainCopy as c } from "@/src/lib/domainCopy";
import { paise, nonnegativePaise, solveFuel } from "@/src/utils/money";
import { isCalendarDate, isReading } from "@/src/utils/formInput";
export type RecordFormContext = {
  meterMode?: "KM" | "HOURS" | "BOTH";
  original?: Payload;
  kmRequired?: boolean;
  hoursRequired?: boolean;
  notesRequired?: boolean;
};
export type RecordFormIssue = { field: keyof EntryForm; message: string };
const timestamp = (value: string) =>
  z.iso.datetime({ offset: true }).safeParse(value).success;
const calendar = (value: string) =>
  isCalendarDate(value) ||
  (timestamp(value) && isCalendarDate(value.slice(0, 10)));
export function recordFormIssues(
  kind: Kind,
  v: EntryForm,
  context: RecordFormContext = {},
): RecordFormIssue[] {
  const issues: RecordFormIssue[] = [];
  const issue = (field: keyof EntryForm, message: string) =>
    issues.push({ field, message });
  const hasReadings = v.km !== "" || v.hours !== "";
  for (const key of ["km", "hours"] as const) {
    if (v[key] && !isReading(v[key])) issue(key, t("invalidReading"));
    const hidden = context.meterMode === (key === "km" ? "HOURS" : "KM");
    if (
      hidden &&
      v[key] &&
      (!context.original || Number(v[key]) !== Number(context.original[key]))
    )
      issue(key, t("legacyReading"));
    if (
      hidden &&
      v[key] &&
      context.original?.reading_at &&
      v.observed_at !== context.original.reading_at
    )
      issue("observed_at", t("legacyReading"));
  }
  if (kind === "meters" && !hasReadings)
    issue(context.meterMode === "HOURS" ? "hours" : "km", t("meterRequired"));
  if (context.kmRequired && !v.km) issue("km", t("requiredValue"));
  if (context.hoursRequired && !v.hours) issue("hours", t("requiredValue"));
  if (
    hasReadings &&
    (!timestamp(v.observed_at) || Date.parse(v.observed_at) > Date.now())
  )
    issue("observed_at", t("validPastTime"));
  if (
    ["fuel", "expenses"].includes(kind) &&
    (!timestamp(v.event_at) || Date.parse(v.event_at) > Date.now())
  )
    issue("event_at", t("validPastTime"));
  if (context.notesRequired && !v.notes.trim())
    issue("notes", t("requiredValue"));
  if (kind === "fuel") {
    try {
      solveFuel(v.amount, v.quantity, v.unit_price);
    } catch (error) {
      issue("amount", error instanceof Error ? error.message : c.twoValues);
    }
  }
  if (kind === "expenses") {
    if (!v.title.trim()) issue("title", c.expenseTitle);
    if (!v.category.trim() || v.category.trim().length > 60)
      issue("category", t("requiredValue"));
    try {
      paise(v.amount);
    } catch (error) {
      issue("amount", error instanceof Error ? error.message : c.amount);
    }
    if (v.category === "EMI") {
      try {
        const principal = v.principal ? nonnegativePaise(v.principal) : 0;
        const interest = v.interest ? nonnegativePaise(v.interest) : 0;
        if (principal + interest > paise(v.amount)) issue("principal", c.emi);
      } catch (error) {
        issue("principal", error instanceof Error ? error.message : c.emi);
      }
    }
  }
  if (
    ["fuel", "expenses"].includes(kind) &&
    !["CASH", "UPI", "CARD", "BANK", "OTHER"].includes(v.payment_method)
  )
    issue("payment_method", t("requiredValue"));
  if (["documents", "reminders"].includes(kind) && !v.title.trim())
    issue("title", c.title);
  if (v.due_at && !timestamp(v.due_at)) issue("due_at", c.due);
  const threshold = v.threshold_km !== "" || v.threshold_hours !== "";
  for (const key of ["threshold_km", "threshold_hours"] as const)
    if (v[key] && !isReading(v[key], true))
      issue(key, t("invalidPositiveReading"));
  if (kind === "reminders") {
    if (!v.due_at && !threshold) issue("due_at", t("reminderCriterion"));
    if (v.recurrence !== "NONE" && (!v.due_at || threshold))
      issue("recurrence", t("recurringDate"));
  }
  let meta: Record<string, unknown> = {};
  try {
    meta = z.record(z.string(), z.unknown()).parse(JSON.parse(v.metadata));
  } catch {
    issue("metadata", c.payload);
  }
  for (const key of ["start_date", "expiry_date", "next_date"]) {
    const value = meta[key];
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (typeof value !== "string" || !calendar(value))
    )
      issue("metadata", t("invalidCalendarDate"));
  }
  if (
    meta.start_date &&
    meta.expiry_date &&
    String(meta.expiry_date).slice(0, 10) < String(meta.start_date).slice(0, 10)
  )
    issue("metadata", t("dateOrder"));
  for (const key of ["next_km", "next_hours"])
    if (
      meta[key] !== undefined &&
      meta[key] !== null &&
      meta[key] !== "" &&
      !isReading(String(meta[key]), true)
    )
      issue("metadata", t("invalidPositiveReading"));
  if (meta.create_reminder === true) {
    const due = kind === "documents" ? v.due_at : meta.reminder_due_at;
    if (!due || typeof due !== "string" || !timestamp(due))
      issue(
        kind === "documents" ? "due_at" : "metadata",
        t("linkedReminderDue"),
      );
    if (kind === "expenses" && v.category !== "EMI")
      issue("metadata", c.payload);
    if (
      kind === "expenses" &&
      !["NONE", "MONTHLY", "YEARLY"].includes(
        String(meta.reminder_recurrence ?? "MONTHLY"),
      )
    )
      issue("metadata", t("recurringDate"));
  }
  try {
    const items = z
      .array(
        z.object({
          title: z.string().trim().min(1).max(160),
          amount_paise: z
            .number()
            .int()
            .positive()
            .max(Number.MAX_SAFE_INTEGER),
        }),
      )
      .max(100)
      .parse(JSON.parse(v.items));
    if (
      kind === "expenses" &&
      items.length &&
      items.reduce((sum, item) => sum + BigInt(item.amount_paise), 0n) !==
        BigInt(paise(v.amount))
    )
      issue("items", c.items);
  } catch {
    issue("items", c.items);
  }
  return issues;
}
