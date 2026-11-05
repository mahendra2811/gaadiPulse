import * as Crypto from "expo-crypto";
import { linkedReminder } from "./linkedReminder";
import { permittedFuel, fuelUnit } from "@/src/features/garage/energy";
import { validatePayload } from "./payloadSchemas";
import { client } from "@/src/lib/supabase";
import { requirePilotPolicy } from "@/src/features/members/pilotPolicy";
import {
  listDevelopmentVehicles,
  readDevelopment,
  writeDevelopment,
  DEVELOPMENT_USER,
  requireDevelopment,
  developmentReadings,
} from "@/src/features/development/repository";
import {
  recordSchema,
  type RecordEntry,
  type Kind,
  type Payload,
} from "./schema";
export const tables: Record<Kind, string> = {
  fuel: "fuel_logs",
  expenses: "expenses",
  meters: "meter_events",
  reminders: "reminders",
  documents: "documents",
  progress: "daily_progress",
};
export const readPermission = (kind: Kind) =>
  kind === "progress" ? "progress.view" : `${kind}.read`;
export async function access(
  vehicle: string,
  development: boolean,
): Promise<Record<string, boolean>> {
  if (development) {
    requireDevelopment();
    return new Proxy({ owner: true }, { get: () => true });
  }
  const session = await client().auth.getSession();
  const user = session.data.session?.user.id;
  if (!user) throw new Error("NOT_AUTHENTICATED");
  const { data, error } = await client().rpc("vehicle_access", {
    p_vehicle: vehicle,
  });
  if (error) throw new Error(error.message);
  const permissions = data as Record<string, boolean>;
  if (!permissions.owner) await requirePilotPolicy();
  return permissions;
}
export async function listRecords(
  user: string,
  vehicle: string,
  kind: Kind,
  development: boolean,
): Promise<RecordEntry[]> {
  if (development) {
    const records = recordSchema
      .array()
      .parse((await readDevelopment(`records.${vehicle}.${kind}`)) ?? []);
    const corrections = (await readDevelopment(
      `meterCorrections.${vehicle}`,
    )) as Record<string, { value: number | null }> | null;
    return records.map((record) => {
      const payload = { ...record.payload };
      for (const type of ["KM", "HOURS"] as const) {
        let id = `${record.id}.${type}`;
        for (let i = 0; i < 20; i++) {
          const correction = corrections?.[id];
          if (!correction) break;
          payload[type === "KM" ? "km" : "hours"] = correction.value;
          if (correction.value === null) break;
          id += ".correction";
        }
      }
      if (payload.km === null && payload.hours === null)
        payload.reading_at = null;
      return { ...record, payload };
    });
  }
  const permissions = await access(vehicle, false);
  if (!permissions[readPermission(kind)]) throw new Error("PERMISSION_DENIED");
  let rows: RecordEntry[] = [];
  for (let offset = 0; ; offset += 250) {
    const request =
      kind === "progress"
        ? client().rpc("read_progress_records", {
            p_vehicle: vehicle,
            p_offset: offset,
            p_limit: 250,
          })
        : client()
            .from(tables[kind])
            .select(
              "id,vehicle_id,created_by,revision,status,payload,created_at,updated_at",
            )
            .eq("vehicle_id", vehicle)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(offset, offset + 249);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const page = recordSchema
      .array()
      .parse(data)
      .map((record) => ({
        ...record,
        payload: validatePayload(kind, record.payload),
      }));
    rows = rows.concat(page);
    if (page.length < 250) break;
  }
  return rows;
}

export async function fuelRecord(
  user: string,
  vehicle: string,
  id: string,
  development: boolean,
) {
  if (development)
    return (
      (await listRecords(user, vehicle, "fuel", true)).find(
        (row) => row.id === id,
      ) ?? null
    );
  const permissions = await access(vehicle, false);
  if (!permissions["fuel.read"]) throw new Error("PERMISSION_DENIED");
  const { data, error } = await client()
    .from("fuel_logs")
    .select(
      "id,vehicle_id,created_by,revision,status,payload,created_at,updated_at",
    )
    .eq("vehicle_id", vehicle)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = recordSchema.parse(data);
  return { ...row, payload: validatePayload("fuel", row.payload) };
}

let localWrites: Promise<unknown> = Promise.resolve();
async function saveLocal(
  kind: Kind,
  vehicle: string,
  payload: Payload,
  operation: string,
  id?: string,
  expected?: number,
  status = "ACTIVE",
) {
  requireDevelopment();
  const action = async () => {
    const rows = await listRecords(DEVELOPMENT_USER, vehicle, kind, true);
    const receipt = await readDevelopment(`recordOperation.${operation}`);
    if (receipt) return String(receipt);
    const old = rows.find((r) => r.id === id);
    const recordVehicle = (await listDevelopmentVehicles()).find(
      (item) => item.id === vehicle,
    );
    if (!recordVehicle || recordVehicle.archived_at)
      throw new Error("VEHICLE_ARCHIVED");
    if (kind === "fuel") {
      const configuration = (await listDevelopmentVehicles()).find(
        (item) => item.id === vehicle,
      );
      if (
        !configuration ||
        !permittedFuel(
          configuration.energy_type,
          String(payload.energy_type),
          old?.payload,
        ) ||
        payload.unit !== fuelUnit(String(payload.energy_type))
      )
        throw new Error("VEHICLE_FUEL_MISMATCH");
    }
    if (id && (!old || old.revision !== expected)) throw new Error("CONFLICT");
    if (
      ["fuel", "expenses", "meters"].includes(kind) &&
      status !== "ARCHIVED" &&
      payload.reading_at
    ) {
      const stamp = Date.parse(String(payload.reading_at));
      const history = (await developmentReadings(vehicle)).filter(
        (reading) => !id || !reading.id.startsWith(`${id}.`),
      );
      for (const [key, type] of [
        ["km", "KM"],
        ["hours", "HOURS"],
      ] as const) {
        if (payload[key] === null || payload[key] === undefined) continue;
        const value = Number(payload[key]);
        const sameType = history.filter(
          (reading) => reading.reading_type === type,
        );
        const same = sameType.find(
          (reading) => Date.parse(reading.observed_at) === stamp,
        );
        if (same && same.value !== value)
          throw new Error("METER_READING_CONFLICT");
        const previous = sameType
          .filter((reading) => Date.parse(reading.observed_at) < stamp)
          .sort(
            (a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at),
          )[0];
        const next = sameType
          .filter((reading) => Date.parse(reading.observed_at) > stamp)
          .sort(
            (a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at),
          )[0];
        if (previous && value < previous.value)
          throw new Error("METER_BELOW_PREVIOUS");
        if (next && !next.is_reset && value > next.value)
          throw new Error("METER_ABOVE_NEXT");
      }
    }
    const target = id ?? operation;
    const now = new Date().toISOString();
    const record: RecordEntry = {
      id: target,
      vehicle_id: vehicle,
      created_by: old?.created_by ?? DEVELOPMENT_USER,
      revision: (old?.revision ?? 0) + 1,
      status,
      created_at: old?.created_at ?? now,
      updated_at: now,
      payload,
    };
    await writeDevelopment(`records.${vehicle}.${kind}`, [
      record,
      ...rows.filter((r) => r.id !== target),
    ]);
    if (kind === "expenses" || kind === "documents") {
      const vehicleRow = (await listDevelopmentVehicles()).find(
        (item) => item.id === vehicle,
      );
      const schedule = linkedReminder(
        kind,
        payload,
        target,
        status,
        vehicleRow?.timezone ?? "Asia/Kolkata",
      );
      const reminders = await listRecords(
        DEVELOPMENT_USER,
        vehicle,
        "reminders",
        true,
      );
      const key = kind === "documents" ? "document_id" : "expense_id";
      const related = reminders.filter(
        (row) =>
          ["DOCUMENT", "EMI", "MAINTENANCE"].includes(
            String(row.payload.origin),
          ) && (row.payload.metadata as Payload)?.[key] === target,
      );
      const previous = related.find(
        (row) => row.payload.origin === schedule?.origin,
      );
      const next = reminders.map((row) =>
        related.some((item) => item.id === row.id) &&
        (!schedule || row.id !== previous?.id)
          ? {
              ...row,
              status: "ARCHIVED",
              revision: row.revision + 1,
              updated_at: now,
            }
          : row,
      );
      if (schedule) {
        const merged = {
          ...schedule,
          pilot_visible: previous?.payload.pilot_visible ?? false,
        };
        if (previous) {
          const changed =
            JSON.stringify(merged) !== JSON.stringify(previous.payload);
          const index = next.findIndex((row) => row.id === previous.id);
          next[index] = {
            ...previous,
            payload: merged,
            status: changed ? "ACTIVE" : previous.status,
            revision: previous.revision + (changed ? 1 : 0),
            updated_at: changed ? now : previous.updated_at,
          };
        } else
          next.unshift({
            id: Crypto.randomUUID(),
            vehicle_id: vehicle,
            created_by: DEVELOPMENT_USER,
            revision: 1,
            status: "ACTIVE",
            created_at: now,
            updated_at: now,
            payload: merged,
          });
      }
      await writeDevelopment(`records.${vehicle}.reminders`, next);
    }
    await writeDevelopment(`recordOperation.${operation}`, target);
    return target;
  };
  const result = localWrites.then(action, action);
  localWrites = result.catch(() => {});
  return result;
}
type OnlineOperation = {
  operation_id: string;
  vehicle_id: string;
  kind: Kind;
  entity_id: string | null;
  expected: number | null;
  payload: Payload;
  record_status: string;
};
export async function sendOperation(op: OnlineOperation, signal?: AbortSignal) {
  const rpc = op.kind === "progress" ? "submit_progress" : "save_record";
  const args =
    op.kind === "progress"
      ? {
          p_vehicle: op.vehicle_id,
          p_payload: op.payload,
          p_operation: op.operation_id,
          p_id: op.entity_id,
          p_expected: op.expected,
        }
      : {
          p_kind: op.kind,
          p_vehicle: op.vehicle_id,
          p_payload: op.payload,
          p_operation: op.operation_id,
          p_id: op.entity_id,
          p_expected: op.expected,
          p_status: op.record_status,
        };
  const request = client().rpc(rpc, args);
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw new Error(error.message);
  if (typeof data !== "string" || !data) throw new Error("SAVE_NOT_CONFIRMED");
  return data;
}
export async function saveRecord(
  user: string,
  development: boolean,
  kind: Kind,
  vehicle: string,
  payload: Payload,
  operation: string,
  id?: string,
  expected?: number,
  status = "ACTIVE",
) {
  if (development)
    return {
      id: await saveLocal(
        kind,
        vehicle,
        payload,
        operation,
        id,
        expected,
        status,
      ),
    };
  const idResult = await sendOperation({
    operation_id: operation,
    vehicle_id: vehicle,
    kind,
    entity_id: id ?? null,
    expected: expected ?? null,
    payload,
    record_status: status,
  });
  return { id: idResult };
}
export async function expenseCategories(
  vehicle: string,
  development: boolean,
): Promise<string[]> {
  if (development)
    return ((await readDevelopment(`categories.${vehicle}`)) as string[]) ?? [];
  const { data, error } = await client()
    .from("expense_categories")
    .select("label")
    .eq("vehicle_id", vehicle)
    .order("label");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.label));
}
export async function addExpenseCategory(
  vehicle: string,
  label: string,
  development: boolean,
) {
  if (!label.trim() || label.length > 60) throw new Error("INVALID_CATEGORY");
  if (development) {
    const values = await expenseCategories(vehicle, true);
    await writeDevelopment(`categories.${vehicle}`, [
      ...new Set([...values, label.trim()]),
    ]);
    return;
  }
  const { error } = await client().rpc("add_expense_category", {
    p_vehicle: vehicle,
    p_label: label,
  });
  if (error) throw new Error(error.message);
}

export async function recordAuthorName(
  kind: Kind,
  vehicle: string,
  id: string,
  development: boolean,
) {
  if (development) {
    const { developmentProfile } =
      await import("@/src/features/development/repository");
    return (await developmentProfile()).display_name || null;
  }
  const { data, error } = await client().rpc("record_author_name", {
    p_kind: kind,
    p_vehicle: vehicle,
    p_record: id,
  });
  if (error) throw error;
  return data?.[0]?.display_name ?? null;
}
