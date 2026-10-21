import { z } from "zod";
import type { Kind, Payload } from "./schema";
const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const meters = {
  km: z.number().nonnegative().nullable(),
  hours: z.number().nonnegative().nullable(),
  reading_at: z.string().nullable(),
};
export const fuelPayloadSchema = z
  .object({
    event_at: z.string(),
    amount_paise: amount,
    quantity: z.number().positive().max(1000000),
    unit_price_paise: amount,
    unit: z.enum(["L", "KG", "KWH"]),
    energy_type: z.enum([
      "PETROL",
      "DIESEL",
      "ELECTRIC",
      "CNG",
      "HYBRID",
      "OTHER",
    ]),
    is_full_tank: z.boolean(),
    ...meters,
  })
  .passthrough();
export const expensePayloadSchema = z
  .object({
    event_at: z.string(),
    title: z.string().min(1),
    amount_paise: amount,
    category: z.string().min(1),
    principal_paise: z.number().int().nonnegative().nullable(),
    interest_paise: z.number().int().nonnegative().nullable(),
    metadata: z.record(z.string(), z.unknown()),
    items: z.array(z.object({ title: z.string(), amount_paise: amount })),
    ...meters,
  })
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
