import { TimestampRange } from "@/src/components/ui/Timestamp";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { RecordSummary } from "@/src/features/records/RecordCard";
import {
  InfoRows,
  SectionHeading,
  TextAction,
} from "@/src/components/ui/premium";
import { t } from "@/src/lib/i18n";
import { client } from "@/src/lib/supabase";
import { observations as loadObservations } from "@/src/features/meters/api";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import { Screen, Card, AppText, ErrorState } from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { type Kind } from "@/src/features/records/schema";
import { listRecords, readPermission } from "@/src/features/records/api";
import { usePermissions } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { recordsCsv, exportText, exportPdf } from "./export";
import { money } from "@/src/utils/money";
import { expenseAccounting } from "@/src/utils/expenseAccounting";
import { measuredIntervals } from "@/src/utils/meter";
import { fuelIntervals, type FuelPoint } from "@/src/utils/fuelEconomy";
import { dateInZone, shiftDay } from "@/src/features/progress/schema";
const kinds = ["fuel", "expenses", "meters", "reminders", "documents"] as const;
export function Reports() {
  const active = useActiveVehicle();
  const v = active.vehicle;
  const user = useAccountId();
  const { development } = useSession();
  const access = usePermissions(v?.id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState("month");
  const canRead = (kind: Kind) =>
    access.data?.["reports.read"] === true &&
    access.data?.[readPermission(kind)] === true;
  const queries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: [user, v?.id, "report-records", kind],
      enabled: !!v && !!user && canRead(kind),
      queryFn: () => listRecords(user!, v!.id, kind, development),
    })),
  });
  const observationQuery = useQuery({
    queryKey: [user, v?.id, "observations"],
    enabled:
      !!v &&
      !!user &&
      access.data?.["reports.read"] === true &&
      access.data?.["meters.read"] === true,
    queryFn: () => loadObservations(user!, v!.id, development),
  });
  const today = dateInZone(new Date(), v?.timezone ?? "Asia/Kolkata");
  const start =
    period === "month"
      ? `${today.slice(0, 7)}-01`
      : period === "year"
        ? `${today.slice(0, 4)}-01-01`
        : period === "week"
          ? shiftDay(
              today,
              -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7),
            )
          : "0000-01-01";
  const all = kinds.flatMap((kind, index) =>
    canRead(kind) && !queries[index].error
      ? (queries[index].data ?? [])
          .filter((row) => row.status !== "ARCHIVED")
          .map((row) => ({ ...row, kind }))
      : [],
  );
  const rows = all.filter(
    (row) =>
      dateInZone(
        new Date(
          String(
            row.kind === "meters"
              ? (row.payload.reading_at ?? row.created_at)
              : (row.payload.event_at ?? row.created_at),
          ),
        ),
        v?.timezone ?? "Asia/Kolkata",
      ) >= start,
  );
  const expenseRows = rows.filter((row) => row.kind === "expenses");
  const fuel = rows.filter((row) => row.kind === "fuel");
  const cash = [...fuel, ...expenseRows].reduce(
    (s, row) => s + Number(row.payload.amount_paise ?? 0),
    0,
  );
  const accounting = expenseRows.map((row) =>
    expenseAccounting(
      Number(row.payload.amount_paise),
      String(row.payload.category),
      row.payload.principal_paise as number | null,
      row.payload.interest_paise as number | null,
    ),
  );
  const operating =
    fuel.reduce((s, row) => s + Number(row.payload.amount_paise ?? 0), 0) +
    accounting.reduce((s, a) => s + a.operating, 0);
  const observations = observationQuery.data ?? [];
  const measured = measuredIntervals(observations).filter(
    (interval) =>
      dateInZone(new Date(interval.from), v?.timezone ?? "Asia/Kolkata") >=
      start,
  );
  const intervals = access.data?.["meters.read"]
    ? fuelIntervals(
        fuel.map((row) => ({ id: row.id, ...row.payload }) as FuelPoint),
        observations,
      )
    : [];
  const queryError =
    queries.find((q, index) => canRead(kinds[index]) && q.error)?.error ??
    observationQuery.error;
  const loading =
    queries.some((q, index) => canRead(kinds[index]) && q.isPending) ||
    (!!v &&
      access.data?.["reports.read"] === true &&
      access.data?.["meters.read"] === true &&
      observationQuery.isPending);
  const exportData = async (format: "json" | "csv" | "pdf") => {
    if (!v || loading || queryError) return;
    setBusy(true);
    setError("");
    try {
      let exportRows = rows;
      let exportMeasured = measured;
      if (!development) {
        const proof = await client().rpc("vehicle_access", { p_vehicle: v.id });
        if (proof.error) throw new Error(proof.error.message);
        const permissions = proof.data as Record<string, boolean>;
        if (!permissions["reports.read"]) throw new Error(r("permission"));
        const allowed = kinds.filter(
          (kind) => permissions[readPermission(kind)],
        );
        exportRows = (
          await Promise.all(
            allowed.map(async (kind) =>
              (await listRecords(user!, v.id, kind, false))
                .filter((row) => row.status !== "ARCHIVED")
                .map((row) => ({ ...row, kind })),
            ),
          )
        )
          .flat()
          .filter(
            (row) =>
              dateInZone(
                new Date(
                  String(
                    row.kind === "meters"
                      ? (row.payload.reading_at ?? row.created_at)
                      : (row.payload.event_at ?? row.created_at),
                  ),
                ),
                v.timezone,
              ) >= start,
          );
        exportMeasured = permissions["meters.read"]
          ? measuredIntervals(
              await loadObservations(user!, v.id, false),
            ).filter(
              (interval) =>
                dateInZone(new Date(interval.from), v.timezone) >= start,
            )
          : [];
      }
      const exportFinancial = exportRows.filter(
        (row) => row.kind === "fuel" || row.kind === "expenses",
      );
      const exportCash = exportFinancial.reduce(
        (sum, row) => sum + Number(row.payload.amount_paise ?? 0),
        0,
      );
      const exportOperating = exportFinancial.reduce(
        (sum, row) =>
          sum +
          (row.kind === "fuel"
            ? Number(row.payload.amount_paise)
            : expenseAccounting(
                Number(row.payload.amount_paise),
                String(row.payload.category),
                row.payload.principal_paise as number | null,
                row.payload.interest_paise as number | null,
              ).operating),
        0,
      );
      const name = `GaadiPulse-${v.id}-${today}`;
      if (format === "json")
        await exportText(
          JSON.stringify(
            {
              vehicle: {
                id: v.id,
                nickname: v.nickname,
                meter_mode: v.meter_mode,
                timezone: v.timezone,
              },
              period,
              generated_at: new Date().toISOString(),
              records: exportRows,
              measured_intervals: exportMeasured,
            },
            null,
            2,
          ),
          `${name}.json`,
          "application/json",
        );
      else if (format === "csv")
        await exportText(recordsCsv(exportRows), `${name}.csv`, "text/csv");
      else
        await exportPdf(`GaadiPulse · ${v.nickname}`, [
          `${r("cash")}: ${money(exportCash)}`,
          `${r("operating")}: ${money(exportOperating)}`,
          `${r("confirmed")}: ${exportRows.length}`,
          ...exportMeasured.map(
            (m) =>
              `${m.from} → ${m.to}: ${m.delta} ${m.type}${m.anomaly ? " · non-monotonic" : ""}`,
          ),
        ]);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  if (access.error)
    return (
      <Screen title={r("reports")}>
        <ErrorState
          message={access.error.message}
          retry={() => void access.refetch()}
        />
      </Screen>
    );
  return (
    <Screen
      compact
      title={r("reports")}
      loading={
        loading ||
        busy ||
        access.isPending ||
        (!!access.data?.["meters.read"] && observationQuery.isPending)
      }
    >
      <VehicleHeader />
      <AppText muted>{r("authorizedScope")}</AppText>
      {access.data && !access.data["reports.read"] ? (
        <AppText>{r("permission")}</AppText>
      ) : (
        <>
          <FilterChips
            items={(["week", "month", "year", "all"] as const).map((id) => ({
              id,
              label: r(id),
            }))}
            value={period}
            onChange={setPeriod}
          />
          {queryError ? (
            <ErrorState
              message={queryError.message}
              retry={() =>
                void Promise.all([
                  ...queries
                    .filter((_, index) => canRead(kinds[index]))
                    .map((q) => q.refetch()),
                  ...(access.data?.["meters.read"]
                    ? [observationQuery.refetch()]
                    : []),
                ])
              }
            />
          ) : (
            <>
              <RecordSummary
                kind="expenses"
                value={loading ? "—" : money(cash)}
                subtitle={`${r("cash")} · ${r(period as "week" | "month" | "year" | "all")}`}
              />
              <Card style={{ padding: 16 }}>
                <SectionHeading title={t("uiSummary")} />
                <InfoRows
                  items={[
                    { label: r("operating"), value: money(operating) },
                    {
                      label: r("financing"),
                      value: money(
                        accounting.reduce(
                          (sum, item) => sum + item.financing,
                          0,
                        ),
                      ),
                    },
                    {
                      label: r("unclassified"),
                      value: money(
                        accounting.reduce(
                          (sum, item) => sum + item.unclassified,
                          0,
                        ),
                      ),
                    },
                    { label: r("confirmed"), value: String(rows.length) },
                  ]}
                />
              </Card>
              <AppText large>{r("efficiency")}</AppText>
              {intervals.length ? (
                intervals.map((interval, index) => (
                  <Card key={index}>
                    <TimestampRange
                      from={interval.from}
                      to={interval.to}
                      timezone={v?.timezone}
                    />
                    <AppText>
                      {interval.kmPerUnit === null
                        ? r("unknown")
                        : `${interval.kmPerUnit.toFixed(2)} KM/${interval.unit}`}
                    </AppText>
                    {interval.unitsPerHour !== null && (
                      <AppText>
                        {interval.unitsPerHour.toFixed(2)} {interval.unit}/HOURS
                      </AppText>
                    )}
                  </Card>
                ))
              ) : (
                <AppText>{r("unknown")}</AppText>
              )}
              <AppText large>{r("measured")}</AppText>
              {measured.length ? (
                measured.map((interval, index) => (
                  <Card key={index}>
                    <TimestampRange
                      from={interval.from}
                      to={interval.to}
                      timezone={v?.timezone}
                    />
                    <AppText>
                      {interval.anomaly
                        ? r("conflict")
                        : `${interval.delta} ${interval.type}`}
                    </AppText>
                  </Card>
                ))
              ) : (
                <AppText>{r("unknown")}</AppText>
              )}
              <Card style={{ padding: 16 }}>
                <SectionHeading title={r("reports")} />
                <TextAction
                  label={r("exportJson")}
                  disabled={busy || loading}
                  icon="code-download-outline"
                  onPress={() => {
                    if (!busy && !loading) void exportData("json");
                  }}
                />
                <TextAction
                  label={r("exportCsv")}
                  disabled={busy || loading}
                  icon="grid-outline"
                  onPress={() => {
                    if (!busy && !loading) void exportData("csv");
                  }}
                />
                <TextAction
                  label="PDF"
                  disabled={busy || loading}
                  icon="document-text-outline"
                  onPress={() => {
                    if (!busy && !loading) void exportData("pdf");
                  }}
                />
              </Card>
            </>
          )}
        </>
      )}
      {error && <ErrorState message={error} retry={() => setError("")} />}
    </Screen>
  );
}
