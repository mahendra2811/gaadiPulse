import { onlineManager, useInfiniteQuery } from "@tanstack/react-query";
import { client } from "@/src/lib/supabase";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { listRecords } from "./api";
import { recordSchema } from "./schema";
import { validatePayload } from "./payloadSchemas";
import { useSyncExternalStore } from "react";
import { t } from "@/src/lib/i18n";

export type FuelFilters = {
  start: string;
  end: string;
  min: number | null;
  max: number | null;
  search: string;
  timezone: string;
};
const pageSize = 30;
export function useFuelHistory(
  vehicle: string | undefined,
  enabled: boolean,
  allowed: boolean,
  filters: FuelFilters,
) {
  const user = useAccountId();
  const { development } = useSession();
  const online = useSyncExternalStore(
    (changed) => onlineManager.subscribe(changed),
    () => onlineManager.isOnline(),
    () => true,
  );
  const query = useInfiniteQuery({
    queryKey: [user, vehicle, "fuel-history", allowed, filters],
    enabled: !!user && !!vehicle && enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!allowed) throw new Error("PERMISSION_DENIED");
      if (!development && !onlineManager.isOnline())
        throw new Error("Network unavailable");
      if (development) {
        const all = (await listRecords(user!, vehicle!, "fuel", true))
          .filter((row) => {
            const date = dateInZone(
              new Date(String(row.payload.event_at)),
              filters.timezone,
            );
            const amount = Number(row.payload.amount_paise);
            const haystack = [
              row.payload.title,
              row.payload.notes,
              row.payload.category,
              row.payload.station_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return (
              row.status !== "ARCHIVED" &&
              (!filters.start || date >= filters.start) &&
              (!filters.end || date <= filters.end) &&
              (filters.min === null || amount >= filters.min) &&
              (filters.max === null || amount <= filters.max) &&
              haystack.includes(filters.search.toLowerCase())
            );
          })
          .sort(
            (a, b) =>
              b.created_at.localeCompare(a.created_at) ||
              b.id.localeCompare(a.id),
          );
        return {
          rows: all.slice(pageParam, pageParam + pageSize),
          count: all.length,
          total: all.reduce(
            (sum, row) => sum + Number(row.payload.amount_paise),
            0,
          ),
        };
      }
      const { data, error } = await client().rpc("fuel_history_page", {
        p_vehicle: vehicle!,
        p_start: filters.start || null,
        p_end: filters.end || null,
        p_min: filters.min,
        p_max: filters.max,
        p_search: filters.search,
        p_offset: pageParam,
        p_limit: pageSize,
      });
      if (error) throw error;
      return {
        rows: recordSchema
          .array()
          .parse(data.rows)
          .map((row) => ({
            ...row,
            payload: validatePayload("fuel", row.payload),
          })),
        count: Number(data.count),
        total: Number(data.total_paise),
      };
    },
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.rows.length, 0);
      return loaded < last.count && last.rows.length ? loaded : undefined;
    },
  });
  return {
    ...query,
    error: !development && !online ? new Error(t("offline")) : query.error,
    isPending: !development && !online ? false : query.isPending,
    rows:
      !development && !online
        ? undefined
        : query.data?.pages.flatMap((page) => page.rows),
    count: query.data?.pages[0]?.count ?? 0,
    total: query.data?.pages[0]?.total ?? 0,
  };
}
