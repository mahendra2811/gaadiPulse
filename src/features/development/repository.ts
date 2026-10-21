import * as Crypto from "expo-crypto";
import { readLocal, writeLocal } from "@/src/lib/localStore";
import {
  vehicleSchema,
  vehicleRecordSchema,
  type VehicleInput,
  type Vehicle,
} from "@/src/features/garage/schema";
import type { Profile } from "@/src/features/auth/profile";
export const DEVELOPMENT_USER = "local-development";
export function requireDevelopment() {
  if (!__DEV__)
    throw new Error("Development mode is unavailable in release builds.");
}
export async function readDevelopment(key: string): Promise<unknown> {
  requireDevelopment();
  return readLocal(`development.${key}`);
}
export async function writeDevelopment(key: string, value: unknown) {
  requireDevelopment();
  return writeLocal(`development.${key}`, value);
}
export async function listDevelopmentVehicles() {
  return vehicleRecordSchema
    .array()
    .parse((await readDevelopment("vehicles")) ?? []);
}
// A serial queue keeps multiple local test writes from overwriting one another.
let writes: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = writes.then(action, action);
  writes = next.catch(() => undefined);
  return next;
}
export function saveDevelopmentVehicle(
  input: VehicleInput,
  operation: string,
  id?: string,
  expected?: string,
) {
  return serialize(async () => {
    const value = vehicleSchema.parse(input);
    const previous = await readDevelopment(`operation.${operation}`);
    if (typeof previous === "string") return previous;
    const vehicles = await listDevelopmentVehicles();
    const old = vehicles.find((v) => v.id === id);
    if (id && (!old || old.updated_at !== expected))
      throw new Error("CONFLICT: Refresh the vehicle before editing again.");
    const vehicle: Vehicle = {
      id: id ?? operation,
      nickname: value.nickname,
      registration_number: value.registration_number || null,
      category: value.category,
      subtype: value.subtype,
      brand: value.brand,
      model: value.model,
      energy_type: value.energy_type,
      meter_mode: value.meter_mode,
      timezone: value.timezone,
      archived_at: old?.archived_at ?? null,
      updated_at: new Date().toISOString(),
      role: "OWNER",
    };
    const records = [...vehicles.filter((v) => v.id !== vehicle.id), vehicle];
    // The operation UUID is the new vehicle ID, preventing duplicate creation on interrupted retries.
    const state = await readDevelopment("state");
    const base = state && typeof state === "object" ? state : {};
    const meters = id
      ? ((base as Record<string, unknown>)[id] ?? [])
      : (["KM", "HOURS"] as const).flatMap((kind) => {
          const raw = kind === "KM" ? value.km : value.hours;
          return raw && value.meter_mode !== (kind === "KM" ? "HOURS" : "KM")
            ? [
                {
                  id: Crypto.randomUUID(),
                  reading_type: kind,
                  value: Number(raw),
                  observed_at: value.observed_at,
                },
              ]
            : [];
        });
    await writeDevelopment("state", { ...base, [vehicle.id]: meters });
    await writeDevelopment("vehicles", records);
    await writeDevelopment(`operation.${operation}`, vehicle.id);
    return vehicle.id;
  });
}
export function archiveDevelopmentVehicle(id: string, archived: boolean) {
  return serialize(async () => {
    const records = await listDevelopmentVehicles();
    if (!records.some((v) => v.id === id)) throw new Error("Vehicle not found");
    await writeDevelopment(
      "vehicles",
      records.map((v) =>
        v.id === id
          ? {
              ...v,
              archived_at: archived ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }
          : v,
      ),
    );
  });
}
export type DevelopmentObservation = {
  id: string;
  reading_type: "KM" | "HOURS";
  value: number;
  observed_at: string;
  entered_at?: string;
  source?: string;
  is_reset?: boolean;
  status?: string;
};
export async function developmentReadings(
  id: string,
  includeHistory = false,
): Promise<DevelopmentObservation[]> {
  const state = (await readDevelopment("state")) as Record<
    string,
    DevelopmentObservation[]
  > | null;
  const rows: DevelopmentObservation[] = [...(state?.[id] ?? [])];
  for (const kind of ["fuel", "expenses", "meters", "progress"]) {
    const records = (await readDevelopment(`records.${id}.${kind}`)) as
      | {
          id: string;
          status: string;
          created_at: string;
          payload: Record<string, unknown>;
        }[]
      | null;
    for (const record of records ?? []) {
      if (
        record.status === "ARCHIVED" ||
        (kind === "progress" && record.status !== "APPROVED") ||
        !record.payload.reading_at
      )
        continue;
      for (const type of ["KM", "HOURS"] as const) {
        const value = record.payload[type === "KM" ? "km" : "hours"];
        if (value !== null && value !== undefined)
          rows.push({
            id: `${record.id}.${type}`,
            reading_type: type,
            value: Number(value),
            observed_at: String(record.payload.reading_at),
            entered_at: record.created_at,
            source: kind.toUpperCase(),
            is_reset: record.payload.is_reset === true,
          });
      }
    }
  }
  const corrections = (await readDevelopment(
    `meterCorrections.${id}`,
  )) as Record<
    string,
    { value: number | null; reason: string; original?: DevelopmentObservation }
  > | null;
  const expanded = rows.flatMap((row) => {
    const history: DevelopmentObservation[] = [];
    let current = { ...row, status: "ACTIVE" };
    for (let i = 0; i < 20; i++) {
      const correction = corrections?.[current.id];
      if (!correction) break;
      history.push({ ...current, ...correction.original, status: "CORRECTED" });
      if (correction.value === null) return history;
      current = {
        ...current,
        id: `${current.id}.correction`,
        value: correction.value,
        status: "ACTIVE",
      };
    }
    return [...history, current];
  });
  if (includeHistory)
    return expanded.sort(
      (a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at),
    );
  const unique = new Map(
    expanded
      .filter((row) => row.status === "ACTIVE")
      .map((row) => [`${row.reading_type}.${row.observed_at}`, row]),
  );
  return [...unique.values()].sort(
    (a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at),
  );
}
export async function developmentProfile(): Promise<Profile> {
  const value = await readDevelopment("profile");
  return (
    (value as Profile) ?? {
      id: DEVELOPMENT_USER,
      display_name: "Developer",
      locale: "en",
      theme: "system",
      timezone: "Asia/Kolkata",
    }
  );
}
export async function saveDevelopmentProfile(
  profile: Pick<Profile, "display_name" | "theme" | "timezone">,
) {
  await writeDevelopment("profile", {
    ...(await developmentProfile()),
    ...profile,
  });
}
