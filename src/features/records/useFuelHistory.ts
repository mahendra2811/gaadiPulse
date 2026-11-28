import { onlineManager, useInfiniteQuery } from "@tanstack/react-query";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { listRecords } from "./api";
import { useSyncExternalStore } from "react";
import { t } from "@/src/lib/i18n";
import { recordCurrency, recordMinorAmount } from "./currency";
import type { CurrencyCode } from "@/src/utils/currency";

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
      const all = (await listRecords(user!, vehicle!, "fuel", false)).filter(
        (row) => {
          const date = dateInZone(
            new Date(String(row.payload.event_at)),
            filters.timezone,
          );
          const amount = recordMinorAmount(row.payload);
          return (
            row.status !== "ARCHIVED" &&
            (!filters.start || date >= filters.start) &&
            (!filters.end || date <= filters.end) &&
            (!filters.currency ||
              recordCurrency(row.payload) === filters.currency) &&
            (filters.min === null || amount >= filters.min) &&
            (filters.max === null || amount <= filters.max) &&
            `${row.payload.title ?? ""} ${row.payload.notes ?? ""} ${row.payload.station_name ?? ""}`
              .toLowerCase()
              .includes(filters.search.toLowerCase())
          );
        },
      );
      return {
        rows: all.slice(pageParam, pageParam + pageSize),
        count: all.length,
        total: all.reduce(
          (sum, row) => sum + recordMinorAmount(row.payload),
          0,
        ),
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
