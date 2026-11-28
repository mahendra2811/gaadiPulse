import { onlineManager, useInfiniteQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { dateInZone } from "@/src/features/progress/schema";
import { listRecords } from "./api";
import { client } from "@/src/lib/supabase";
import { recordSchema, type RecordEntry } from "./schema";
import { t } from "@/src/lib/i18n";
import { recordCurrency, recordMinorAmount } from "./currency";
import type { CurrencyCode } from "@/src/utils/currency";

type Cursor = { created_at: string; id: string } | null;
type ExpensePage = {
  rows: RecordEntry[];
  count: number;
  total: number;
};
type ExpenseRpcPage = {
  rows: Record<string, unknown>[];
  count: number;
  total_paise: string;
};
export type ExpenseFilters = {
  start: string | null;
  search: string;
  status: string;
  timezone: string;
  localDate: string;
  currency?: CurrencyCode;
};
const pageSize = 30;

function safePaise(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number")
    throw new Error("EXPENSE_TOTAL_INVALID");
  const parsed = BigInt(String(value));
  if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("EXPENSE_TOTAL_OUT_OF_RANGE");
  return Number(parsed);
}

function pageFromLegacy(
  rows: Awaited<ReturnType<typeof listRecords>>,
  filters: ExpenseFilters,
  cursor: Cursor,
): ExpensePage {
  const filtered = rows
    .filter((row) => {
      const event = row.payload.event_at ?? row.created_at;
      const date = dateInZone(new Date(String(event)), filters.timezone);
      const haystack =
        `${row.payload.title ?? ""} ${row.payload.notes ?? ""} ${row.payload.category ?? ""} ${row.payload.station_name ?? ""}`.toLowerCase();
      return (
        row.status !== "ARCHIVED" &&
        (!filters.start || date >= filters.start) &&
        (filters.status === "ALL" || row.status === filters.status) &&
        haystack.includes(filters.search.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        b.id.localeCompare(a.id),
    );
  const pageRows = cursor
    ? filtered.filter((row) => {
        const time = Date.parse(row.created_at);
        const before = Date.parse(cursor.created_at);
        return time < before || (time === before && row.id < cursor.id);
      })
    : filtered;
  const total = filtered.reduce(
    (sum, row) =>
      sum +
      BigInt(
        !filters.currency || recordCurrency(row.payload) === filters.currency
          ? recordMinorAmount(row.payload)
          : 0,
      ),
    0n,
  );
  return {
    rows: pageRows.slice(0, pageSize),
    count: filtered.length,
    total: safePaise(total.toString()),
  };
}

export function useExpenseHistory(
  vehicle:
    | {
        id: string;
        role: "OWNER" | "PILOT";
        timezone: string;
        default_currency_code: CurrencyCode;
      }
    | undefined,
  enabled: boolean,
  allowed: boolean,
  filters: ExpenseFilters,
) {
  const user = useAccountId();
  const { development } = useSession();
  const online = useSyncExternalStore(
    (changed) => onlineManager.subscribe(changed),
    () => onlineManager.isOnline(),
    () => true,
  );
  const query = useInfiniteQuery({
    queryKey: [
      user,
      vehicle?.id,
      "expense-history",
      vehicle?.role,
      filters,
      allowed,
    ],
    enabled: !!user && !!vehicle && enabled,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      if (!allowed) throw new Error("PERMISSION_DENIED");
      if (!development && !onlineManager.isOnline())
        throw new Error(t("networkError"));
      if (development) {
        return pageFromLegacy(
          await listRecords(user!, vehicle!.id, "expenses", true),
          filters,
          pageParam,
        );
      }
      const { data, error } = await client().rpc("expense_history_page", {
        p_vehicle: vehicle!.id,
        p_start: filters.start,
        p_status: filters.status,
        p_search: filters.search,
        p_before_created_at: pageParam?.created_at ?? null,
        p_before_id: pageParam?.id ?? null,
        p_limit: pageSize,
      });
      if (error) throw new Error(error.message);
      if (!data || typeof data !== "object")
        throw new Error("EXPENSE_HISTORY_RESPONSE_INVALID");
      const result = data as unknown as ExpenseRpcPage;
      const rows = recordSchema.array().parse(result.rows);
      if (
        !Number.isSafeInteger(Number(result.count)) ||
        Number(result.count) < 0
      )
        throw new Error("EXPENSE_HISTORY_COUNT_INVALID");
      return {
        rows,
        count: Number(result.count),
        total: safePaise(result.total_paise),
      };
    },
    getNextPageParam: (last, pages): Cursor | undefined => {
      const loaded = pages.reduce((sum, page) => sum + page.rows.length, 0);
      const row = last.rows.at(-1);
      return loaded < last.count && row
        ? { created_at: row.created_at, id: row.id }
        : undefined;
    },
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    error: !development && !online ? new Error(t("offline")) : query.error,
    isPending: !development && !online ? false : query.isPending,
    rows: pages.flatMap((page) => page.rows),
    count: pages[0]?.count ?? 0,
    total: pages[0]?.total ?? 0,
  };
}
