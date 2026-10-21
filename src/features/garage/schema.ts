import { t } from "../../lib/i18n";
import { z } from "zod";
export const categories = [
  "two_wheeler",
  "four_wheeler",
  "commercial",
  "agricultural",
  "heavy_machinery",
] as const;
export const meterModes = ["KM", "HOURS", "BOTH"] as const;
export function normalizeRegistration(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}
export function defaultMeter(category: string, subtype: string) {
  return subtype === "excavator"
    ? "HOURS"
    : ["tractor", "tipper"].includes(subtype)
      ? "BOTH"
      : category === "heavy_machinery"
        ? "HOURS"
        : "KM";
}
const reading = z
  .union([z.literal(""), z.string().regex(/^\d+(\.\d{1,3})?$/)])
  .optional();
export const vehicleSchema = z
  .object({
    nickname: z.string().trim().max(120),
    registration_number: z.string().transform(normalizeRegistration),
    category: z.enum(categories),
    subtype: z.string().trim().min(1).max(80),
    brand: z.string().trim().max(80),
    model: z.string().trim().max(80),
    energy_type: z.enum([
      "PETROL",
      "DIESEL",
      "ELECTRIC",
      "CNG",
      "HYBRID",
      "OTHER",
    ]),
    meter_mode: z.enum(meterModes),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, t("invalidTimezone")),
    km: reading,
    hours: reading,
    observed_at: z.iso.datetime({ offset: true }),
  })
  .refine((v) => v.nickname || v.registration_number || v.model, {
    message: t("identifyVehicle"),
    path: ["nickname"],
  });
export type VehicleInput = z.input<typeof vehicleSchema>;
export type Vehicle = {
  id: string;
  nickname: string;
  registration_number: string | null;
  category: (typeof categories)[number];
  subtype: string;
  brand: string;
  model: string;
  energy_type: VehicleInput["energy_type"];
  meter_mode: VehicleInput["meter_mode"];
  timezone: string;
  archived_at: string | null;
  updated_at: string;
  role: "OWNER" | "PILOT";
};
export function selectActive(vehicles: Vehicle[], current: string | null) {
  return (
    vehicles.find((v) => v.id === current && !v.archived_at)?.id ??
    vehicles.find((v) => !v.archived_at)?.id ??
    null
  );
}

export const vehicleRecordSchema = z.object({
  id: z.uuid(),
  nickname: z.string(),
  registration_number: z.string().nullable(),
  category: z.enum(categories),
  subtype: z.string(),
  brand: z.string(),
  model: z.string(),
  energy_type: vehicleSchema.shape.energy_type,
  meter_mode: z.enum(meterModes),
  timezone: z.string(),
  archived_at: z.string().nullable(),
  updated_at: z.string(),
  role: z.enum(["OWNER", "PILOT"]),
});
