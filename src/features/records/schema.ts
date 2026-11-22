import { canonicalDeadline } from "./linkedReminder";
import { recordFormIssues, type RecordFormContext } from "./formRules";
import { fuelTypes, fuelUnit } from "@/src/features/garage/energy";
import { t } from "@/src/lib/i18n";
import { domainCopy as c } from "@/src/lib/domainCopy";
import { z } from "zod";
import {
  currencyDecimals,
  isCurrencyCode,
  minorUnitsDecimal,
  parseMinorUnits,
  solveCurrencyFuel,
  type CurrencyCode,
} from "@/src/utils/currency";
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
export type RecordEntry = z.infer<typeof recordSchema>;
const currencyCode = z.enum([
  "AED",
  "AUD",
  "BHD",
  "CAD",
  "CHF",
  "CNY",
  "EUR",
  "GBP",
  "IDR",
  "INR",
  "JPY",
  "KRW",
  "KWD",
  "MYR",
  "NZD",
  "OMR",
  "SAR",
  "SGD",
  "THB",
  "USD",
  "ZAR",
] as const);
const positive = z.coerce.number().positive().finite();
const optionalReading = z.union([
  z.literal(""),
  z.string().regex(/^\d+(\.\d{1,3})?$/),
]);
export const baseFormSchema = z.object({
  event_at: z.iso.datetime({ offset: true }),
  title: z.string().trim().max(160),
  currency_code: currencyCode.default("INR"),
  amount: z.string(),
  quantity: z.string(),
  unit_price: z.string(),
  unit: z.enum(["L", "KG", "KWH"]),
  energy_type: z.string(),
  is_full_tank: z.boolean(),
  category: z.string().trim().max(60),
  km: optionalReading,
  hours: optionalReading,
  observed_at: z.string(),
  station_name: z.string().trim().max(160),
  vendor: z.string().trim().max(160),
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
  reference: z.string().trim().max(160),
  progress_date: z.string(),
  answers: z.record(z.string(), z.unknown()),
  form_version_id: z.string(),
  is_reset: z.boolean(),
  pilot_visible: z.boolean(),
  confirmed_observation: z.boolean(),
});
export type EntryForm = z.infer<typeof baseFormSchema>;
export function defaultEntry(currency: CurrencyCode = "INR"): EntryForm {
  return {
    event_at: new Date().toISOString(),
    title: "",
    currency_code: currency,
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
export function recordInputSchema(kind: Kind, context: RecordFormContext = {}) {
  return baseFormSchema.superRefine((value, ctx) => {
    for (const issue of recordFormIssues(kind, value, context))
      ctx.addIssue({
        code: "custom",
        path: [issue.field],
        message: issue.message,
      });
  });
}
export function entryPayload(
  kind: Kind,
  input: EntryForm,
  context: RecordFormContext = {},
): Payload {
  const v = recordInputSchema(kind, context).parse(input);
  let metadata: Payload;
  let items: { title: string; amount_minor: number }[];
  try {
    metadata = z.record(z.string(), z.unknown()).parse(JSON.parse(v.metadata));
    items = z
      .array(
        z.object({
          title: z.string().trim().min(1).max(160),
          amount_minor: z
            .number()
            .int()
            .positive()
            .max(Number.MAX_SAFE_INTEGER),
        }),
      )
      .parse(
        JSON.parse(v.items).map((item: Record<string, unknown>) => ({
          title: item.title,
          amount_minor: item.amount_minor ?? item.amount_paise,
        })),
      );
  } catch {
    throw new Error(c.payload);
  }
  const payload: Payload = {
    ...v,
    currency_code: v.currency_code ?? "INR",
    currency_exponent: currencyDecimals(v.currency_code ?? "INR"),
    metadata,
    items,
    km: v.km === "" ? null : Number(v.km),
    hours: v.hours === "" ? null : Number(v.hours),
    reading_at: v.km !== "" || v.hours !== "" ? v.observed_at : null,
    ...(kind === "meters" ? { event_at: v.observed_at } : {}),
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
    throw new Error(t("fillConfirmationRequired"));
  if (kind === "fuel") {
    if (
      !fuelTypes.some((type) => type === v.energy_type) ||
      v.unit !== fuelUnit(v.energy_type)
    )
      throw new Error(t("fuelMismatch"));
    const solved = solveCurrencyFuel(
      v.amount,
      v.quantity,
      v.unit_price,
      v.currency_code ?? "INR",
    );
    Object.assign(payload, solved);
    if ((v.currency_code ?? "INR") === "INR")
      Object.assign(payload, {
        amount_paise: solved.amount_minor,
        unit_price_paise: solved.unit_price_minor,
      });
  }
  if (kind === "expenses") {
    if (!v.title.trim()) throw new Error(c.expenseTitle);
    Object.assign(payload, {
      amount_minor: parseMinorUnits(v.amount, v.currency_code ?? "INR"),
      principal_minor: v.principal
        ? parseMinorUnits(v.principal, v.currency_code ?? "INR", true)
        : null,
      interest_minor: v.interest
        ? parseMinorUnits(v.interest, v.currency_code ?? "INR", true)
        : null,
    });
    if (
      items.length &&
      items.reduce((s, i) => s + i.amount_minor, 0) !== payload.amount_minor
    )
      throw new Error(c.items);
    if ((v.currency_code ?? "INR") === "INR")
      Object.assign(payload, {
        amount_paise: payload.amount_minor,
        principal_paise: payload.principal_minor,
        interest_paise: payload.interest_minor,
        items: items.map((item) => ({
          title: item.title,
          amount_paise: item.amount_minor,
        })),
      });
    if (
      v.category === "EMI" &&
      Number(payload.principal_minor ?? 0) +
        Number(payload.interest_minor ?? 0) >
        Number(payload.amount_minor)
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
export function formFromRecord(
  record: RecordEntry,
  timezone = "Asia/Kolkata",
): EntryForm {
  const p = record.payload;
  const currency = isCurrencyCode(String(p.currency_code))
    ? (p.currency_code as CurrencyCode)
    : "INR";
  const amountMinor = Number(p.amount_minor ?? p.amount_paise ?? 0);
  const unitPriceMinor = Number(p.unit_price_minor ?? p.unit_price_paise ?? 0);
  const principalMinor = p.principal_minor ?? p.principal_paise;
  const interestMinor = p.interest_minor ?? p.interest_paise;
  return {
    ...defaultEntry(currency),
    ...p,
    due_at: p.due_at ? canonicalDeadline(String(p.due_at), timezone) : "",
    amount: amountMinor ? minorUnitsDecimal(amountMinor, currency) : "",
    unit_price: unitPriceMinor
      ? minorUnitsDecimal(unitPriceMinor, currency)
      : "",
    quantity: p.quantity ? String(p.quantity) : "",
    km: p.km === null ? "" : String(p.km ?? ""),
    hours: p.hours === null ? "" : String(p.hours ?? ""),
    principal:
      principalMinor !== null && principalMinor !== undefined
        ? minorUnitsDecimal(Number(principalMinor), currency)
        : "",
    interest:
      interestMinor !== null && interestMinor !== undefined
        ? minorUnitsDecimal(Number(interestMinor), currency)
        : "",
    metadata: JSON.stringify(p.metadata ?? {}),
    items: JSON.stringify(p.items ?? []),
  } as EntryForm;
}
