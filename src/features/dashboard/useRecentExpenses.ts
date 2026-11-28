import { useQuery } from "@/src/lib/query";
import { client } from "@/src/lib/supabase";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { isPilotHistoryVisible } from "@/src/features/members/history";
import { listRecords } from "@/src/features/records/api";
import { validatePayload } from "@/src/features/records/payloadSchemas";
import { recordSchema } from "@/src/features/records/schema";
import type { Vehicle } from "@/src/features/garage/schema";

export function useRecentExpenses(
  vehicle: Vehicle | undefined,
  enabled: boolean,
  now: number,
) {
  const user = useAccountId();
  const { development } = useSession();
  const localDate = vehicle ? dateInZone(new Date(now), vehicle.timezone) : "";
  return useQuery({
    queryKey: [user, vehicle?.id, "recent-expenses", vehicle?.role, localDate],
    enabled: !!user && !!vehicle && enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      let rows: unknown;
      if (development) {
        const all = await listRecords(
          user!,
          vehicle!.id,
          "expenses",
          true,
          signal,
        );
        return all
          .filter(
            (row) =>
              row.status !== "ARCHIVED" &&
              (vehicle!.role !== "PILOT" ||
                isPilotHistoryVisible(
                  String(row.payload.event_at ?? row.created_at),
                  vehicle!.timezone,
                  now,
                )),
          )
          .sort(
            (a, b) =>
              Date.parse(String(b.payload.event_at ?? b.created_at)) -
                Date.parse(String(a.payload.event_at ?? a.created_at)) ||
              b.id.localeCompare(a.id),
          )
          .slice(0, 10);
      }
      let request = client().rpc("recent_expense_activity", {
        p_vehicle: vehicle!.id,
        p_limit: 10,
      });
      if ("abortSignal" in request) request = request.abortSignal(signal);
      const result = await request;
      if (
        result.error &&
        ["PGRST202", "42883"].includes(result.error.code ?? "")
      ) {
        const legacy = await listRecords(
          user!,
          vehicle!.id,
          "expenses",
          false,
          signal,
        );
        return legacy
          .filter(
            (row) =>
              row.status !== "ARCHIVED" &&
              (vehicle!.role !== "PILOT" ||
                isPilotHistoryVisible(
                  String(row.payload.event_at),
                  vehicle!.timezone,
                  now,
                )),
          )
          .sort((a, b) => {
            const left = Date.parse(String(a.payload.event_at));
            const right = Date.parse(String(b.payload.event_at));
            return right - left || b.id.localeCompare(a.id);
          })
          .slice(0, 10);
      }
      if (result.error) throw new Error(result.error.message);
      rows = result.data;
      return recordSchema
        .array()
        .parse(rows)
        .map((row) => ({
          ...row,
          payload: validatePayload("expenses", row.payload),
        }));
    },
  });
}
