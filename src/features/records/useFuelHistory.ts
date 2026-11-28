import { onlineManager, useInfiniteQuery } from "@tanstack/react-query";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { client } from "@/src/lib/supabase";
import { listRecords } from "./api";
import { useSyncExternalStore } from "react";
import { t } from "@/src/lib/i18n";
import { recordCurrency, recordMinorAmount } from "./currency";
import type { CurrencyCode } from "@/src/utils/currency";
import { recordSchema } from "./schema";

export type FuelFilters = {
  start: string;
  end: string;
  min: number | null;
  max: number | null;
  search: string;
  timezone: string;
  currency?: CurrencyCode;
};
const pageSize = 30;
type HistoryPage = {
  rows: Awaited<ReturnType<typeof listRecords>>;
  count: number;
  total_paise: string;
};
function parsePage(value: unknown): HistoryPage {
  if (!value || typeof value !== "object")
    throw new Error("FUEL_HISTORY_RESPONSE_INVALID");
  const page = value as Record<string, unknown>;
  const rows = Array.isArray(page.rows) ? page.rows : [];
  const count = Number(page.count);
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error("FUEL_HISTORY_COUNT_INVALID");
  return {
    rows: rows as HistoryPage["rows"],
    count,
    total_paise: String(page.total_paise ?? "0"),
  };
}
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
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      if (!allowed) throw new Error("PERMISSION_DENIED");
      if (!development && !onlineManager.isOnline())
        throw new Error(t("networkError"));
      if (development) {
        const all = (await listRecords(user!, vehicle!, "fuel", true))
          .filter((row) => {
            const date = dateInZone(
              new Date(String(row.payload.event_at)),
              filters.timezone,
            );
            const amount = recordMinorAmount(row.payload);
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
              (!filters.currency ||
                recordCurrency(row.payload) === filters.currency) &&
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
            (sum, row) =>
              !filters.currency ||
              recordCurrency(row.payload) === filters.currency
                ? sum + recordMinorAmount(row.payload)
                : sum,
            0,
          ),
        };
      }
      let request = client().rpc("fuel_history_page", {
        p_vehicle: vehicle!,
        p_start: filters.start || null,
        p_end: filters.end || null,
        p_min: filters.min,
        p_max: filters.max,
        p_search: filters.search,
        p_offset: pageParam,
        p_limit: pageSize,
      });
      if ("abortSignal" in request) request = request.abortSignal(signal);
      const { data, error } = await request;
      if (error) throw new Error(error.message);
      const result = parsePage(data);
      const rows = recordSchema.array().parse(result.rows);
      const raw = BigInt(result.total_paise);
      if (raw < 0n || raw > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error("FUEL_TOTAL_OUT_OF_RANGE");
      return {
        rows,
        count: result.count,
        total: Number(raw),
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
