import { fuelTypes } from "@/src/features/garage/energy";
import { z } from "zod";
import type { Kind, Payload } from "./schema";
const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
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
const meters = {
  km: z.number().nonnegative().nullable(),
  hours: z.number().nonnegative().nullable(),
  reading_at: z.string().nullable(),
};
export const fuelPayloadSchema = z
  .object({
    event_at: z.string(),
    currency_code: currencyCode.default("INR"),
    currency_exponent: z.number().int().min(0).max(4).default(2),
    amount_minor: amount.optional(),
    amount_paise: amount.optional(),
    quantity: z.number().positive().max(1000000),
    unit_price_minor: amount.optional(),
    unit_price_paise: amount.optional(),
    unit: z.enum(["L", "KG", "KWH"]),
    energy_type: z.enum(fuelTypes),
    is_full_tank: z.boolean(),
    ...meters,
  })
  .refine(
    (value) =>
      value.amount_minor !== undefined || value.amount_paise !== undefined,
  )
  .refine(
    (value) =>
      value.unit_price_minor !== undefined ||
      value.unit_price_paise !== undefined,
  )
  .passthrough();
export const expensePayloadSchema = z
  .object({
    event_at: z.string(),
    title: z.string().min(1),
    currency_code: currencyCode.default("INR"),
    currency_exponent: z.number().int().min(0).max(4).default(2),
    amount_minor: amount.optional(),
    amount_paise: amount.optional(),
    category: z.string().min(1),
    principal_minor: z.number().int().nonnegative().nullable().optional(),
    interest_minor: z.number().int().nonnegative().nullable().optional(),
    principal_paise: z.number().int().nonnegative().nullable().optional(),
    interest_paise: z.number().int().nonnegative().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()),
    items: z.array(
      z.object({
        title: z.string(),
        amount_minor: amount.optional(),
        amount_paise: amount.optional(),
      }),
    ),
    ...meters,
  })
  .refine(
    (value) =>
      value.amount_minor !== undefined || value.amount_paise !== undefined,
  )
  .passthrough();
export const progressPayloadSchema = z
  .object({
    form_version_id: z.uuid(),
    progress_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    answers: z.record(z.string(), z.unknown()),
    ...meters,
  })
  .passthrough();
export type FuelPayload = z.infer<typeof fuelPayloadSchema>;
export type ExpensePayload = z.infer<typeof expensePayloadSchema>;
export function validatePayload(kind: Kind, payload: Payload): Payload {
  if (kind === "fuel") return fuelPayloadSchema.parse(payload);
  if (kind === "expenses") return expensePayloadSchema.parse(payload);
  if (kind === "progress") return progressPayloadSchema.parse(payload);
  return payload;
}
