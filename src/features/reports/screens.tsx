import { client } from "@/src/lib/supabase";
import { observations as loadObservations } from "@/src/features/meters/api";
import { useState } from "react";
import { router } from "expo-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Screen,
  Card,
  AppText,
  AppButton,
  ErrorState,
} from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import {
  kinds,
  type RecordEntry,
  type Kind,
} from "@/src/features/records/schema";
import { listRecords, readPermission } from "@/src/features/records/api";
import { usePermissions, useRecords } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { recordsCsv, exportText, exportPdf } from "./export";
import { money } from "@/src/utils/money";
import { expenseAccounting } from "@/src/utils/expenseAccounting";
import { measuredIntervals, type Observation } from "@/src/utils/meter";
import { fuelIntervals, type FuelPoint } from "@/src/utils/fuelEconomy";
import { formVersions } from "@/src/features/progress/api";
import {
  aggregateAnswers,
  dateInZone,
  shiftDay,
} from "@/src/features/progress/schema";
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
      queryKey: [user, v?.id, "report-records",kind],
      enabled: !!v && !!user && canRead(kind),
      queryFn: () => listRecords(user!, v!.id, kind, development),
    })),
  });
  const forms = useQuery({
    queryKey: [user, v?.id, "forms"],
    enabled: !!v && canRead("progress"),
    queryFn: () => formVersions(v!.id, development),
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
    canRead(kind)
      ? (queries[index].data ?? [])
          .filter((row) => !row.localStatus && row.status !== "ARCHIVED")
          .map((row) => ({ ...row, kind }))
      : [],
  );
  const rows = all.filter(
    (row) =>
      (row.kind === "progress"
        ? String(row.payload.progress_date)
        : dateInZone(
            new Date(
              String(
                row.kind === "meters"
                  ? (row.payload.reading_at ?? row.created_at)
                  : (row.payload.event_at ?? row.created_at),
              ),
            ),
            v?.timezone ?? "Asia/Kolkata",
          )) >= start,
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
  const derivedObservations: Observation[] = rows
    .filter(
      (row) =>
        row.kind === "meters" ||
        row.kind === "fuel" ||
        row.kind === "expenses" ||
        (row.kind === "progress" && row.status === "APPROVED"),
    )
    .flatMap((row) =>
      (["KM", "HOURS"] as const).flatMap((type) => {
        const value = row.payload[type === "KM" ? "km" : "hours"];
        return value !== null && value !== undefined && row.payload.reading_at
          ? [
              {
                id: `${row.id}.${type}`,
                reading_type: type,
                value: Number(value),
                observed_at: String(row.payload.reading_at),
                is_reset: row.payload.is_reset === true,
              },
            ]
          : [];
      }),
    );
  const observations = observationQuery.data ?? derivedObservations;
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
  const queryError = queries.find(
    (q, index) => canRead(kinds[index]) && q.error,
  )?.error;
  const loading = queries.some(
    (q, index) => canRead(kinds[index]) && q.isPending,
  );
  const exportData = async (format: "json" | "csv" | "pdf") => {
    if (!v || loading || queryError) return;
    setBusy(true);
    setError("");
    try {
      let exportRows = rows;
      let exportForms = forms.data ?? [];
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
                .filter((row) => !row.localStatus && row.status !== "ARCHIVED")
                .map((row) => ({ ...row, kind })),
            ),
          )
        )
          .flat()
          .filter(
            (row) =>
              (row.kind === "progress"
                ? String(row.payload.progress_date)
                : dateInZone(
                    new Date(
                      String(
                        row.kind === "meters"
                          ? (row.payload.reading_at ?? row.created_at)
                          : (row.payload.event_at ?? row.created_at),
                      ),
                    ),
                    v.timezone,
                  )) >= start,
          );
        exportForms = permissions["progress.view"]
          ? await formVersions(v.id, false)
          : [];
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
              forms: exportForms,
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
  if(access.error)return <Screen title={r('reports')}><ErrorState message={access.error.message} retry={()=>void access.refetch()}/><AppButton secondary label={r('back')} onPress={()=>router.back()}/></Screen>;
  return (
    <Screen
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
          {(["week", "month", "year", "all"] as const).map((p) => (
            <AppButton
              key={p}
              secondary={period !== p}
              label={r(p)}
              onPress={() => setPeriod(p)}
            />
          ))}
          {queryError ? (
            <ErrorState
              message={queryError.message}
              retry={() => void Promise.all(queries.map((q) => q.refetch()))}
            />
          ) : (
            <>
              <Card>
                <AppText muted>{r("authorizedScope")}</AppText>
                <AppText>
                  {r("cash")}: {money(cash)}
                </AppText>
                <AppText>
                  {r("operating")}: {money(operating)}
                </AppText>
                <AppText>
                  {r("financing")}:{" "}
                  {money(accounting.reduce((s, a) => s + a.financing, 0))}
                </AppText>
                <AppText>
                  {r("unclassified")}:{" "}
                  {money(accounting.reduce((s, a) => s + a.unclassified, 0))}
                </AppText>
                <AppText>
                  {r("confirmed")}: {rows.length}
                </AppText>
              </Card>
              <AppText large>{r("efficiency")}</AppText>
              {intervals.length ? (
                intervals.map((interval, index) => (
                  <Card key={index}>
                    <AppText>
                      {interval.from} → {interval.to}
                    </AppText>
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
                    <AppText>
                      {interval.from} → {interval.to}
                    </AppText>
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
              {forms.data?.map((version) =>
                version.definition.fields
                  .filter((field) => field.reportable)
                  .map((field) => (
                    <Card key={`${version.id}.${field.id}`}>
                      <AppText>
                        {field.label} · {r(field.aggregation)}
                      </AppText>
                      <AppText>
                        {String(
                          aggregateAnswers(
                            rows
                              .filter(
                                (row) =>
                                  row.kind === "progress" &&
                                  row.status === "APPROVED" &&
                                  row.payload.form_version_id === version.id,
                              )
                              .map(
                                (row) =>
                                  row.payload.answers as Record<
                                    string,
                                    unknown
                                  >,
                              ),
                            field,
                          ) ?? "—",
                        )}
                      </AppText>
                    </Card>
                  )),
              )}
              <AppButton
                label={r("exportJson")}
                disabled={busy || loading}
                onPress={() => void exportData("json")}
              />
              <AppButton
                secondary
                label={r("exportCsv")}
                disabled={busy || loading}
                onPress={() => void exportData("csv")}
              />
              <AppButton
                secondary
                label="PDF"
                disabled={busy || loading}
                onPress={() => void exportData("pdf")}
              />
            </>
          )}
        </>
      )}
      {error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
    </Screen>
  );
}
export function Maintenance() {
  const active = useActiveVehicle();
  const query = useRecords("expenses");
  const rows =
    query.data?.filter(
      (row) =>
        ["SERVICE", "REPAIR", "TYRES", "BATTERY"].includes(
          String(row.payload.category),
        ) && row.status !== "ARCHIVED",
    ) ?? [];
  return (
    <Screen
      title={r("maintenance")}
      loading={query.isPending && !!active.vehicle}
    >
      <VehicleHeader />
      <AppButton
        label={r("add")}
        onPress={() =>
          router.push({
            pathname: "/records/[kind]/[action]",
            params: { kind: "expenses", action: "add" },
          })
        }
      />
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : rows.length ? (
        rows.map((row) => (
          <Card key={row.id}>
            <AppText>{String(row.payload.title)}</AppText>
            <AppText>{String(row.payload.event_at)}</AppText>
            <AppText>{money(Number(row.payload.amount_paise))}</AppText>
            <AppText>{JSON.stringify(row.payload.metadata ?? {})}</AppText>
            <AppButton
              secondary
              label={r("detail")}
              onPress={() =>
                router.push({
                  pathname: "/records/[kind]/[action]",
                  params: {
                    kind: "expenses",
                    action: row.id,
                    vehicle: row.vehicle_id,
                  },
                })
              }
            />
          </Card>
        ))
      ) : (
        <AppText>{r("noData")}</AppText>
      )}
    </Screen>
  );
}
