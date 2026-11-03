import type { Kind, Payload } from "./schema";
import { isCalendarDate } from "@/src/utils/formInput";
/** Older date-only schedules mean 09:00 in the vehicle timezone, never an observation. */
export function canonicalDeadline(value: string, timezone: string) {
  if (!isCalendarDate(value)) return value;
  const target = Date.parse(`${value}T09:00:00Z`);
  let guess = target;
  for (let step = 0; step < 3; step++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const n = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(
      n("year"),
      n("month") - 1,
      n("day"),
      n("hour"),
      n("minute"),
      n("second"),
    );
    guess += target - represented;
  }
  return new Date(guess).toISOString();
}
export function linkedReminder(
  kind: Kind,
  payload: Payload,
  sourceId: string,
  status: string,
  timezone: string,
): Payload | null {
  if (status === "ARCHIVED") return null;
  const meta = (payload.metadata ?? {}) as Payload;
  const base = {
    title: payload.title,
    category: payload.category,
    pilot_visible: false,
    threshold_km: "",
    threshold_hours: "",
  };
  if (kind === "documents" && meta.create_reminder === true && payload.due_at)
    return {
      ...base,
      origin: "DOCUMENT",
      due_at: payload.due_at,
      recurrence: "NONE",
      metadata: { document_id: sourceId },
    };
  if (
    kind === "expenses" &&
    payload.category === "EMI" &&
    meta.create_reminder === true &&
    meta.reminder_due_at
  )
    return {
      ...base,
      origin: "EMI",
      due_at: meta.reminder_due_at,
      recurrence: meta.reminder_recurrence ?? "MONTHLY",
      metadata: { expense_id: sourceId },
    };
  if (
    kind === "expenses" &&
    (meta.next_date || meta.next_km || meta.next_hours)
  )
    return {
      ...base,
      origin: "MAINTENANCE",
      due_at: meta.next_date
        ? canonicalDeadline(String(meta.next_date), timezone)
        : null,
      threshold_km: meta.next_km ?? "",
      threshold_hours: meta.next_hours ?? "",
      recurrence: "NONE",
      metadata: { expense_id: sourceId },
    };
  return null;
}
