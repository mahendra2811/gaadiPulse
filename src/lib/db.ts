import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
let database: Promise<SQLite.SQLiteDatabase> | undefined;
export async function db() {
  database ??= SQLite.openDatabaseAsync("gaadipulse.db").then(async (d) => {
    await d.execAsync(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS drafts (user_id TEXT NOT NULL, draft_key TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,draft_key));",
    );
    return d;
  });
  return database;
}
export async function saveDraft(user: string, key: string, value: unknown) {
  if (Platform.OS === "web") {
    localStorage.setItem(
      `gaadipulse.draft.${user}.${key}`,
      JSON.stringify(value),
    );
    return;
  }
  await (
    await db()
  ).runAsync(
    "INSERT OR REPLACE INTO drafts VALUES (?, ?, ?, ?)",
    user,
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}
export async function loadDraft(user: string, key: string): Promise<unknown> {
  if (Platform.OS === "web") {
    const raw = localStorage.getItem(`gaadipulse.draft.${user}.${key}`);
    return raw ? JSON.parse(raw) : null;
  }
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>(
    "SELECT payload FROM drafts WHERE user_id=? AND draft_key=?",
    user,
    key,
  );
  return row ? JSON.parse(row.payload) : null;
}
export async function clearDraft(user: string, key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(`gaadipulse.draft.${user}.${key}`);
    return;
  }
  await (
    await db()
  ).runAsync("DELETE FROM drafts WHERE user_id=? AND draft_key=?", user, key);
}
export async function clearUserData(user: string) {
  if (Platform.OS === "web") {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(`gaadipulse.draft.${user}.`))
        localStorage.removeItem(key);
    return;
  }
  await (await db()).runAsync("DELETE FROM drafts WHERE user_id=?", user);
}
export async function draftCount(user: string) {
  if (Platform.OS === "web")
    return Object.keys(localStorage).filter((k) =>
      k.startsWith(`gaadipulse.draft.${user}.`),
    ).length;
  return (
    (
      await (
        await db()
      ).getFirstAsync<{ count: number }>(
        "SELECT count(*) AS count FROM drafts WHERE user_id=?",
        user,
      )
    )?.count ?? 0
  );
}
export async function listDrafts(user:string):Promise<{key:string;value:unknown;updated_at:string}[]>{if(Platform.OS==='web'){const prefix=`gaadipulse.draft.${user}.`;return Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>({key:key.slice(prefix.length),value:JSON.parse(localStorage.getItem(key)!),updated_at:''}));}const rows=await(await db()).getAllAsync<{draft_key:string;payload:string;updated_at:string}>('SELECT draft_key,payload,updated_at FROM drafts WHERE user_id=? ORDER BY updated_at DESC',user);return rows.map(row=>({key:row.draft_key,value:JSON.parse(row.payload),updated_at:row.updated_at}));}
