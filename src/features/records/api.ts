import { validatePayload } from "./payloadSchemas";
import { client } from "@/src/lib/supabase";
import {
  readLocal,
  writeLocal,
  removeLocal,
  clearVehicleCache,
} from "@/src/lib/localStore";
import {
  readDevelopment,
  writeDevelopment,
  DEVELOPMENT_USER,
  requireDevelopment,
} from "@/src/features/development/repository";
import {
  recordSchema,
  type RecordEntry,
  type Kind,
  type Payload,
} from "./schema";
import {
  operations,
  putOperation,
  removeOperation,
  classifySyncError,
  retryDelay,
  type Operation,
} from "@/src/lib/sync/outbox";
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
  const key = `user.${user}.access.${vehicle}`;
  try {
    const { data, error } = await client().rpc("vehicle_access", {
      p_vehicle: vehicle,
    });
    if (error) throw new Error(error.message);
    const result = data as Record<string, boolean>;
    await writeLocal(key, { result, expires: Date.now() + 3600000 });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/PERMISSION|JWT|TOKEN|AUTHENTICATED/i.test(message)) {
      await removeLocal(key);
      await clearVehicleCache(user, vehicle);
      throw error;
    }
    const cached = (await readLocal(key)) as {
      result: Record<string, boolean>;
      expires: number;
    } | null;
    if (
      /network|fetch|offline|connection|timeout/i.test(message) &&
      cached &&
      cached.expires > Date.now()
    )
      return cached.result;
    throw error;
  }
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
  const key = `user.${user}.cache.${vehicle}.${kind}`;
  let scope: string | null = null;
  try {
    const permissions = await access(vehicle, false);
    scope = JSON.stringify(permissions);
    if (!permissions[readPermission(kind)]) {
      await removeLocal(key);
      throw new Error("PERMISSION_DENIED");
    }
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
    await writeLocal(key, { rows, scope, expires: Date.now() + 3600000 });
    return rows;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/PERMISSION|JWT|TOKEN|AUTHENTICATED/i.test(message)) {
      await removeLocal(key);
      throw e;
    }
    const cache = (await readLocal(key)) as {
      rows: RecordEntry[];
      scope: string;
      expires: number;
    } | null;
    if (
      /network|fetch|offline|connection|timeout/i.test(message) &&
      cache &&
      cache.expires > Date.now() &&
      cache.scope === scope
    )
      return recordSchema.array().parse(cache.rows);
    throw e;
  }
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
    if (id && (!old || old.revision !== expected)) throw new Error("CONFLICT");
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
    await writeDevelopment(`recordOperation.${operation}`, target);
    return target;
  };
  const result = localWrites.then(action, action);
  localWrites = result.catch(() => {});
  return result;
}
export async function sendOperation(op: Operation, signal?: AbortSignal) {
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
  return String(data);
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
      pending: false,
    };
  const op: Operation = {
    operation_id: operation,
    user_id: user,
    vehicle_id: vehicle,
    kind,
    entity_id: id ?? null,
    expected: expected ?? null,
    payload,
    record_status: status,
    created_at: new Date().toISOString(),
    attempts: 0,
    next_retry_at: new Date().toISOString(),
    status: "PENDING",
    error: null,
  };
  await putOperation(op);
  try {
    const result = await sendOperation(op);
    await removeOperation(user, operation);
    await writeLocal(`user.${user}.lastSync`, new Date().toISOString());
    return { id: result, pending: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    op.status = classifySyncError(message);
    op.error = message;
    op.attempts = 1;
    op.next_retry_at = new Date(Date.now() + retryDelay(1)).toISOString();
    await putOperation(op);
    if (op.status !== "PENDING") throw new Error(message);
    return { id: id ?? operation, pending: true };
  }
}
let syncing = false;
let syncGeneration = 0;
let syncController: AbortController | null = null;
export function cancelSynchronization() {
  syncGeneration++;
  syncController?.abort();
  syncController = null;
}
export async function synchronize(user: string, force = false) {
  if (syncing) return { completed: 0 };
  let completed = 0;
  const generation = syncGeneration;
  syncing = true;
  try {
    for (const op of await operations(user)) {
      if (generation !== syncGeneration) return { completed };
      if (
        op.status === "REJECTED" ||
        op.status === "CONFLICT" ||
        (!force && Date.parse(op.next_retry_at) > Date.now())
      )
        continue;
      const current = await client().auth.getSession();
      if (
        generation !== syncGeneration ||
        current.data.session?.user.id !== user
      )
        return { completed };
      await putOperation({ ...op, status: "SYNCING" });
      try {
        const controller = new AbortController();
        syncController = controller;
        await sendOperation(op, controller.signal);
        if (generation !== syncGeneration) return { completed };
        await removeOperation(user, op.operation_id);
        completed++;
      } catch (e) {
        if (generation !== syncGeneration) return { completed };
        const message = e instanceof Error ? e.message : String(e);
        const status = classifySyncError(message);
        await putOperation({
          ...op,
          status,
          error: message,
          attempts: op.attempts + 1,
          next_retry_at: new Date(
            Date.now() + retryDelay(op.attempts + 1),
          ).toISOString(),
        });
        if (status === "PENDING") break;
      }
    }
  } finally {
    syncing = false;
    syncController = null;
    if (completed > 0 && generation === syncGeneration)
      await writeLocal(`user.${user}.lastSync`, new Date().toISOString());
  }
  return { completed };
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

export async function recordAudit(vehicle: string, id: string) {
  const { data, error } = await client()
    .from("audit_events")
    .select("id,actor_id,action,context,created_at")
    .eq("vehicle_id", vehicle)
    .contains("context", { id })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
