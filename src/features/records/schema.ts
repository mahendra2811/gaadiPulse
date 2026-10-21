import { r } from "./copy";
import { domainCopy as c } from "@/src/lib/domainCopy";
import { z } from "zod";
import { solveFuel, paise, nonnegativePaise } from "@/src/utils/money";
export const kinds = [
  "fuel",
  "expenses",
  "meters",
  "reminders",
  "documents",
  "progress",
] as const;
export type Kind = (typeof kinds)[number];
export const expenseCategories = [
  "SERVICE",
  "REPAIR",
  "TYRES",
  "BATTERY",
  "INSURANCE",
  "EMI",
  "DOCUMENTS",
  "TOLL",
  "PARKING",
  "WASH",
  "ACCESSORIES",
  "TAX_PERMIT",
  "FINE",
  "OTHER",
] as const;
export type Payload = Record<string, unknown>;
export const recordSchema = z.object({
  id: z.uuid(),
  vehicle_id: z.uuid(),
  created_by: z.string(),
  revision: z.number().int(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
export type RecordEntry = z.infer<typeof recordSchema> & {
  localStatus?: "PENDING" | "REJECTED" | "CONFLICT";
};
const positive = z.coerce.number().positive().finite();
const optionalReading = z.union([
  z.literal(""),
  z.string().regex(/^\d+(\.\d{1,3})?$/),
]);
export const baseFormSchema = z.object({
  event_at: z.iso.datetime({ offset: true }),
  title: z.string().max(160),
  amount: z.string(),
  quantity: z.string(),
  unit_price: z.string(),
  unit: z.enum(["L", "KG", "KWH"]),
  energy_type: z.string(),
  is_full_tank: z.boolean(),
  category: z.string(),
  km: optionalReading,
  hours: optionalReading,
  observed_at: z.string(),
  station_name: z.string(),
  vendor: z.string(),
  payment_method: z.string(),
  notes: z.string().max(3000),
  principal: z.string(),
  interest: z.string(),
  metadata: z.string(),
  items: z.string(),
  due_at: z.string(),
  threshold_km: z.string(),
  threshold_hours: z.string(),
  recurrence: z.enum(["NONE", "MONTHLY", "YEARLY"]),
  reference: z.string(),
  progress_date: z.string(),
  answers: z.record(z.string(), z.unknown()),
  form_version_id: z.string(),
  is_reset: z.boolean(),
  pilot_visible: z.boolean(),
  confirmed_observation: z.boolean(),
});
export type EntryForm = z.infer<typeof baseFormSchema>;
export function defaultEntry(): EntryForm {
  return {
    event_at: new Date().toISOString(),
    title: "",
    amount: "",
    quantity: "",
    unit_price: "",
    unit: "L",
    energy_type: "PETROL",
    is_full_tank: false,
    category: "OTHER",
    km: "",
    hours: "",
    observed_at: new Date().toISOString(),
    station_name: "",
    vendor: "",
    payment_method: "CASH",
    notes: "",
    principal: "",
    interest: "",
    metadata: "{}",
    items: "[]",
    due_at: "",
    threshold_km: "",
    threshold_hours: "",
    recurrence: "NONE",
    reference: "",
    progress_date: new Date().toISOString().slice(0, 10),
    answers: {},
    form_version_id: "",
    is_reset: false,
    pilot_visible: true,
    confirmed_observation: false,
  };
}
export function entryPayload(kind: Kind, input: EntryForm): Payload {
  const v = baseFormSchema.parse(input);
  let metadata: Payload;
  let items: { title: string; amount_paise: number }[];
  try {
    metadata = z.record(z.string(), z.unknown()).parse(JSON.parse(v.metadata));
    items = z
      .array(
        z.object({
          title: z.string().trim().min(1).max(160),
          amount_paise: z.number().int().positive(),
        }),
      )
      .parse(JSON.parse(v.items));
  } catch {
    throw new Error(c.payload);
  }
  const payload: Payload = {
    ...v,
    metadata,
    items,
    km: v.km === "" ? null : Number(v.km),
    hours: v.hours === "" ? null : Number(v.hours),
    reading_at: v.km !== "" || v.hours !== "" ? v.observed_at : null,
  };
  if (
    (payload.km !== null || payload.hours !== null) &&
    (!z.iso.datetime({ offset: true }).safeParse(v.observed_at).success ||
      Date.parse(v.observed_at) > Date.now())
  )
    throw new Error(c.observation);
  if (
    kind === "fuel" &&
    (v.km !== "" || v.hours !== "") &&
    Date.parse(v.observed_at) === Date.parse(v.event_at) &&
    !v.confirmed_observation
  )
    throw new Error(r("fillConfirmation"));
  if (kind === "fuel")
    Object.assign(payload, solveFuel(v.amount, v.quantity, v.unit_price));
  if (kind === "expenses") {
    if (!v.title.trim()) throw new Error(c.expenseTitle);
    Object.assign(payload, {
      amount_paise: paise(v.amount),
      principal_paise: v.principal ? nonnegativePaise(v.principal) : null,
      interest_paise: v.interest ? nonnegativePaise(v.interest) : null,
    });
    if (
      items.length &&
      items.reduce((s, i) => s + i.amount_paise, 0) !== payload.amount_paise
    )
      throw new Error(c.items);
    if (
      v.category === "EMI" &&
      Number(payload.principal_paise ?? 0) +
        Number(payload.interest_paise ?? 0) >
        Number(payload.amount_paise)
    )
      throw new Error(c.emi);
  }
  if (kind === "meters" && payload.km === null && payload.hours === null)
    throw new Error(c.reading);
  if (["documents", "reminders"].includes(kind) && !v.title.trim())
    throw new Error(c.title);
  if (v.due_at && !z.iso.datetime({ offset: true }).safeParse(v.due_at).success)
    throw new Error(c.due);
  for (const key of ["threshold_km", "threshold_hours"] as const)
    if (v[key] && !positive.safeParse(v[key]).success)
      throw new Error(c.threshold);
  return payload;
}
export function formFromRecord(record: RecordEntry): EntryForm {
  const p = record.payload;
  return {
    ...defaultEntry(),
    ...p,
    amount: p.amount_paise ? String(Number(p.amount_paise) / 100) : "",
    unit_price: p.unit_price_paise
      ? String(Number(p.unit_price_paise) / 100)
      : "",
    quantity: p.quantity ? String(p.quantity) : "",
    km: p.km === null ? "" : String(p.km ?? ""),
    hours: p.hours === null ? "" : String(p.hours ?? ""),
    principal:
      p.principal_paise !== null && p.principal_paise !== undefined
        ? String(Number(p.principal_paise) / 100)
        : "",
    interest:
      p.interest_paise !== null && p.interest_paise !== undefined
        ? String(Number(p.interest_paise) / 100)
        : "",
    metadata: JSON.stringify(p.metadata ?? {}),
    items: JSON.stringify(p.items ?? []),
  } as EntryForm;
}
