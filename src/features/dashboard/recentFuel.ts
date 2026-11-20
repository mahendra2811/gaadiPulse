import { isPilotHistoryVisible } from "@/src/features/members/history";
import type { RecordEntry } from "@/src/features/records/schema";

/** Compare event times at PostgreSQL timestamptz microsecond precision. */
function eventMicroseconds(value: unknown): bigint {
  const timestamp = String(value);
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds)) throw new Error("INVALID_EVENT_TIME");
  const fraction =
    /T\d{2}:\d{2}:\d{2}(?:\.(\d+))?(?:Z|[+-]\d{2}:\d{2})$/i.exec(
      timestamp,
    )?.[1] ?? "";
  let micros = Number((fraction + "000000").slice(0, 6));
  const nextDigit = Number(fraction[6] ?? "0");
  const remainder = fraction.slice(7);
  // PostgreSQL rounds ties to even at microsecond precision.
  if (
    nextDigit > 5 ||
    (nextDigit === 5 && (/[1-9]/.test(remainder) || micros % 2 === 1))
  )
    micros += 1;
  return BigInt(Math.floor(milliseconds / 1000)) * 1000000n + BigInt(micros);
}

export function compareRecentEvents(a: RecordEntry, b: RecordEntry): number {
  const left = eventMicroseconds(a.payload.event_at);
  const right = eventMicroseconds(b.payload.event_at);
  return left === right ? b.id.localeCompare(a.id) : left > right ? -1 : 1;
}

/** Matches the server ordering and Pilot date visibility in local development. */
export function recentFuelRows(
  rows: RecordEntry[],
  role: "OWNER" | "PILOT",
  timezone: string,
  now: number,
  limit = 10,
) {
  return rows
    .filter(
      (row) =>
        row.status !== "ARCHIVED" &&
        (role !== "PILOT" ||
          isPilotHistoryVisible(String(row.payload.event_at), timezone, now)),
    )
    .sort(compareRecentEvents)
    .slice(0, limit);
}

/** A missing RPC is the only case where the complete legacy read is used. */
export async function recentFuelWithFallback<T>(
  result: { data: T | null; error: { code?: string } | null },
  fallback: () => Promise<T>,
): Promise<T> {
  if (result.error) {
    if (result.error.code === "PGRST202" || result.error.code === "42883")
      return fallback();
    throw result.error;
  }
  if (result.data === null) throw new Error("RECENT_FUEL_RESPONSE_INVALID");
  return result.data;
}
