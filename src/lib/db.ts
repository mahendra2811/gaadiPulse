import * as SQLite from "expo-sqlite";
let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  database ??= SQLite.openDatabaseAsync("gaadipulse.db").then(async (d) => {
    await d.execAsync(
      "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS drafts (user_id TEXT NOT NULL, draft_key TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,draft_key));",
    );
    return d;
  });
  return database;
}
export async function saveDraft(user: string, key: string, value: unknown) {
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
  await (
    await db()
  ).runAsync("DELETE FROM drafts WHERE user_id=? AND draft_key=?", user, key);
}
export async function clearUserData(user: string) {
  await (await db()).runAsync("DELETE FROM drafts WHERE user_id=?", user);
}
export async function draftCount(user: string) {
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
