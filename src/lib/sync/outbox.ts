import { Platform } from "react-native";
import { db } from "@/src/lib/db";
import { readLocal, writeLocal } from "@/src/lib/localStore";
import type { Kind, Payload } from "@/src/features/records/schema";
export type Operation = {
  operation_id: string;
  user_id: string;
  vehicle_id: string;
  kind: Kind;
  entity_id: string | null;
  expected: number | null;
  payload: Payload;
  record_status: string;
  created_at: string;
  attempts: number;
  next_retry_at: string;
  status: "PENDING" | "SYNCING" | "REJECTED" | "CONFLICT";
  error: string | null;
};
async function database() {
  const d = await db();
  await d.execAsync(
    `CREATE TABLE IF NOT EXISTS sync_operations(operation_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,vehicle_id TEXT NOT NULL,kind TEXT NOT NULL,entity_id TEXT,payload TEXT NOT NULL,expected INTEGER,record_status TEXT NOT NULL,created_at TEXT NOT NULL,attempts INTEGER NOT NULL,next_retry_at TEXT NOT NULL,status TEXT NOT NULL,error TEXT);CREATE INDEX IF NOT EXISTS outbox_user ON sync_operations(user_id,status);`,
  );
  return d;
}
export async function operations(user: string): Promise<Operation[]> {
  if (Platform.OS === "web")
    return ((await readLocal(`user.${user}.outbox`)) as Operation[]) ?? [];
  const rows = await (
    await database()
  ).getAllAsync<Omit<Operation, "payload"> & { payload: string }>(
    "SELECT * FROM sync_operations WHERE user_id=? ORDER BY created_at",
    user,
  );
  return rows.map((row) => ({
    ...row,
    payload: JSON.parse(row.payload) as Payload,
  }));
}
export async function putOperation(op: Operation) {
  if (Platform.OS === "web") {
    const rows = await operations(op.user_id);
    await writeLocal(`user.${op.user_id}.outbox`, [
      ...rows.filter((v) => v.operation_id !== op.operation_id),
      op,
    ]);
    return;
  }
  await (
    await database()
  ).runAsync(
    "INSERT OR REPLACE INTO sync_operations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    op.operation_id,
    op.user_id,
    op.vehicle_id,
    op.kind,
    op.entity_id,
    JSON.stringify(op.payload),
    op.expected,
    op.record_status,
    op.created_at,
    op.attempts,
    op.next_retry_at,
    op.status,
    op.error,
  );
}
export async function removeOperation(user: string, id: string) {
  if (Platform.OS === "web") {
    await writeLocal(
      `user.${user}.outbox`,
      (await operations(user)).filter((o) => o.operation_id !== id),
    );
    return;
  }
  await (
    await database()
  ).runAsync(
    "DELETE FROM sync_operations WHERE user_id=? AND operation_id=?",
    user,
    id,
  );
}
export async function clearOperations(user: string) {
  if (Platform.OS === "web") {
    await writeLocal(`user.${user}.outbox`, []);
    return;
  }
  await (
    await database()
  ).runAsync("DELETE FROM sync_operations WHERE user_id=?", user);
}
export function retryDelay(attempt: number) {
  return Math.min(300000, 1000 * 2 ** Math.min(attempt, 8));
}
export function classifySyncError(
  message: string,
): "CONFLICT" | "REJECTED" | "PENDING" {
  if (/CONFLICT|VERSION/i.test(message)) return "CONFLICT";
  if (
    /PERMISSION|FORBIDDEN|OWNER_REQUIRED|NOT_VERIFIED|INVALID|VIOLAT|CONSTRAINT|AMOUNT|REQUIRED|INCONSISTENT|MISMATCH|FUTURE_TRANSACTION|DATE_WINDOW/i.test(
      message,
    )
  )
    return "REJECTED";
  return "PENDING";
}
