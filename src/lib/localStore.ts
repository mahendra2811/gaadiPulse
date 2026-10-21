import { Platform } from "react-native";
import { db } from "./db";
export async function readLocal(key: string): Promise<unknown> {
  if (Platform.OS === "web") {
    const raw = localStorage.getItem(`gaadipulse.${key}`);
    return raw ? JSON.parse(raw) : null;
  }
  const d = await db();
  await d.execAsync(
    "CREATE TABLE IF NOT EXISTS local_records (record_key TEXT PRIMARY KEY,payload TEXT NOT NULL)",
  );
  const row = await d.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM local_records WHERE record_key=?",
    key,
  );
  return row ? JSON.parse(row.payload) : null;
}
export async function writeLocal(key: string, value: unknown) {
  if (Platform.OS === "web") {
    localStorage.setItem(`gaadipulse.${key}`, JSON.stringify(value));
    return;
  }
  const d = await db();
  await d.execAsync(
    "CREATE TABLE IF NOT EXISTS local_records (record_key TEXT PRIMARY KEY,payload TEXT NOT NULL)",
  );
  await d.runAsync(
    "INSERT OR REPLACE INTO local_records VALUES (?,?)",
    key,
    JSON.stringify(value),
  );
}
export async function removeLocal(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(`gaadipulse.${key}`);
    return;
  }
  const d = await db();
  await d.runAsync("DELETE FROM local_records WHERE record_key=?", key);
}
export async function removeUserLocal(user: string) {
  if (Platform.OS === "web") {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(`gaadipulse.user.${user}.`))
        localStorage.removeItem(key);
    return;
  }
  const d = await db();
  await d.runAsync(
    "DELETE FROM local_records WHERE record_key LIKE ?",
    `user.${user}.%`,
  );
}
export async function clearVehicleCache(user: string, vehicle: string) {
  const prefixes = [
    `user.${user}.cache.${vehicle}.`,
    `user.${user}.access.${vehicle}`,
    `user.${user}.forms.${vehicle}`,
  ];
  if (Platform.OS === "web") {
    for (const key of Object.keys(localStorage))
      if (prefixes.some((prefix) => key.startsWith(`gaadipulse.${prefix}`)))
        localStorage.removeItem(key);
    return;
  }
  const d = await db();
  for (const prefix of prefixes)
    await d.runAsync(
      "DELETE FROM local_records WHERE record_key LIKE ?",
      `${prefix}%`,
    );
}
export async function removeUserCaches(user: string) {
  if (Platform.OS === "web") {
    for (const key of Object.keys(localStorage))
      if (
        key.startsWith(`gaadipulse.user.${user}.`) &&
        key !== `gaadipulse.user.${user}.outbox`
      )
        localStorage.removeItem(key);
    return;
  }
  const d = await db();
  await d.runAsync(
    "DELETE FROM local_records WHERE record_key LIKE ? AND record_key<>?",
    `user.${user}.%`,
    `user.${user}.outbox`,
  );
}
