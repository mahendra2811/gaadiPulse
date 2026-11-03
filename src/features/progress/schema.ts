import { isCalendarDate, isDecimal } from "@/src/utils/formInput";
import { t } from "@/src/lib/i18n";
import { domainCopy as c } from "@/src/lib/domainCopy";
import { z } from "zod";
export const fieldTypes = [
  "text",
  "paragraph",
  "integer",
  "decimal",
  "currency",
  "boolean",
  "checkbox",
  "select",
  "multiselect",
  "date",
  "time",
  "location_text",
  "start_location",
  "destination",
  "route",
  "trip_count",
] as const;
export const fieldSchema = z
  .object({
    id: z.uuid(),
    label: z.string().trim().min(1).max(120),
    helper: z.string().max(300).default(""),
    type: z.enum(fieldTypes),
    required: z.boolean(),
    default_value: z
      .union([
        z.string().max(3000),
        z.number().finite(),
        z.boolean(),
        z.array(z.string()).max(50),
        z.null(),
      ])
      .optional(),
    options: z.array(z.string().min(1).max(100)).max(50),
    min: z.number().nullable(),
    max: z.number().nullable(),
    reportable: z.boolean(),
    visibility: z.enum(["ALL", "OWNER"]),
    aggregation: z.enum(["SUM", "AVG", "LAST"]),
  })
  .refine((f) => f.min === null || f.max === null || f.min <= f.max, {
    message: c.minimum,
  })
  .refine(
    (f) => !["select", "multiselect"].includes(f.type) || f.options.length > 0,
    { message: c.options },
  );
export type ProgressField = z.infer<typeof fieldSchema>;
export const progressDefinitionSchema = z.object({
  fields: z.array(fieldSchema).max(40),
  past_days: z.number().int().min(0).max(365),
  review_required: z.boolean(),
  km_required: z.boolean(),
  hours_required: z.boolean(),
  notes_required: z.boolean(),
  notes_visible: z.boolean().default(true),
});
export const publishDefinitionSchema = progressDefinitionSchema.superRefine(
  (definition, ctx) => {
    const ids = new Set<string>();
    definition.fields.forEach((field, index) => {
      if (ids.has(field.id))
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "id"],
          message: t("fieldIdsUnique"),
        });
      ids.add(field.id);
      if (
        new Set(field.options.map((option) => option.trim())).size !==
          field.options.length ||
        field.options.some((option) => !option.trim())
      )
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "options"],
          message: t("fieldOptionsUnique"),
        });
      if (
        field.reportable &&
        !["integer", "decimal", "currency", "trip_count"].includes(field.type)
      )
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "reportable"],
          message: t("fieldReportingNumeric"),
        });
      if (!definition.notes_visible && definition.notes_required)
        ctx.addIssue({
          code: "custom",
          path: ["notes_required"],
          message: t("requiredValue"),
        });
    });
  },
);
export type ProgressDefinition = z.infer<typeof progressDefinitionSchema>;
export type FormVersion = {
  id: string;
  vehicle_id: string;
  version: number;
  definition: ProgressDefinition;
  created_at: string;
  published: boolean;
};
export const defaultDefinition: ProgressDefinition = {
  fields: [],
  past_days: 1,
  review_required: true,
  km_required: false,
  hours_required: false,
  notes_required: false,
  notes_visible: true,
};
export function validateAnswers(
  fields: ProgressField[],
  answers: Record<string, unknown>,
  owner = false,
) {
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.visibility === "OWNER" && !owner) continue;
    let value = answers[f.id];
    if (
      value === undefined &&
      f.default_value !== undefined &&
      f.default_value !== null
    )
      value = f.default_value;
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      if (f.required) throw new Error(`${f.label}: ${c.required}`);
      continue;
    }
    if (["integer", "decimal", "currency", "trip_count"].includes(f.type)) {
      const n = Number(value);
      if (
        !isDecimal(value, {
          scale: ["integer", "trip_count"].includes(f.type)
            ? 0
            : f.type === "currency"
              ? 2
              : 6,
          signed: f.type !== "trip_count",
        }) ||
        !Number.isFinite(n) ||
        (["integer", "trip_count"].includes(f.type) && !Number.isInteger(n)) ||
        (f.min !== null && n < f.min) ||
        (f.max !== null && n > f.max) ||
        (f.type === "trip_count" && n < 0)
      )
        throw new Error(`${f.label}: ${c.number}`);
      result[f.id] = n;
    } else if (["boolean", "checkbox"].includes(f.type)) {
      if (typeof value !== "boolean")
        throw new Error(`${f.label}: ${c.boolean}`);
      result[f.id] = value;
    } else if (f.type === "select") {
      if (!f.options.includes(String(value)))
        throw new Error(`${f.label}: ${c.choice}`);
      result[f.id] = value;
    } else if (f.type === "multiselect") {
      if (
        !Array.isArray(value) ||
        value.some((v) => typeof v !== "string" || !f.options.includes(v)) ||
        new Set(value).size !== value.length
      )
        throw new Error(`${f.label}: ${c.choices}`);
      result[f.id] = value;
    } else {
      if (
        typeof value !== "string" ||
        value.length > 3000 ||
        (f.min !== null && value.length < f.min) ||
        (f.max !== null && value.length > f.max)
      )
        throw new Error(`${f.label}: ${c.text}`);
      if (f.type === "date" && !isCalendarDate(value))
        throw new Error(`${f.label}: ${t("invalidCalendarDate")}`);
      if (f.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
        throw new Error(`${f.label}: ${c.time}`);
      if (!value.trim()) {
        if (f.required) throw new Error(`${f.label}: ${c.required}`);
        continue;
      }
      result[f.id] = value.trim();
    }
  }
  return result;
}
export function dateInZone(time: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-${parts.find((p) => p.type === "day")!.value}`;
}
export function shiftDay(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function validateProgressDate(
  date: string,
  zone: string,
  past: number,
  now = new Date(),
) {
  const today = dateInZone(now, zone);
  if (
    !isCalendarDate(date) ||
    date > today ||
    date < shiftDay(today, -past) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error("DATE_WINDOW_VIOLATION");
}
export function aggregateAnswers(
  values: Record<string, unknown>[],
  field: ProgressField,
) {
  const numbers = values
    .map((v) => v[field.id])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!numbers.length) return null;
  return field.aggregation === "LAST"
    ? numbers[numbers.length - 1]
    : field.aggregation === "AVG"
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : numbers.reduce((a, b) => a + b, 0);
}
