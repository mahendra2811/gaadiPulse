import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { InfoRows, SectionHeading } from "@/src/components/ui/premium";
import { Screen, Card, AppText, ErrorState } from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import {
  access as verifyAccess,
  listRecords,
  readPermission,
} from "@/src/features/records/api";
import { usePermissions } from "@/src/features/records/hooks";
import { observations as loadObservations } from "@/src/features/meters/api";
import { useQuery } from "@/src/lib/query";
import { money } from "@/src/utils/money";
import { r } from "@/src/features/records/copy";
import { exportText, exportPdf } from "./export";
import { reportCsv } from "./csv";
import { reportHtml } from "./reportHtml";
import { ExportActions } from "./ExportActions";
import { buildReport, type ReportKind } from "./reportData";
import type { InsightPeriod } from "./insightPeriods";

const kinds: ReportKind[] = [
  "fuel",
  "expenses",
  "meters",
  "reminders",
  "documents",
];
type ExportFormat = "json" | "csv" | "pdf";
export function Reports() {
  const v = useActiveVehicle().vehicle;
  const user = useAccountId();
  const { development } = useSession();
  const access = usePermissions(v?.id);
  const [error, setError] = useState("");
  const [failedFormat, setFailedFormat] = useState<ExportFormat | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<InsightPeriod>("month");
  const canRead = (kind: ReportKind) =>
    access.data?.["reports.read"] === true &&
    access.data?.[readPermission(kind)] === true;
  const canReadMeters =
    access.data?.["reports.read"] === true &&
    access.data?.["meters.read"] === true;
  const queries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: [user, v?.id, "report-records", kind],
      enabled: !!v && !!user && canRead(kind),
      queryFn: () => listRecords(user!, v!.id, kind, development),
    })),
  });
  const observationQuery = useQuery({
    queryKey: [user, v?.id, "observations"],
    enabled: !!v && !!user && canReadMeters,
    queryFn: () => loadObservations(user!, v!.id, development),
  });
  const queryError =
    queries.find((q, index) => canRead(kinds[index]) && q.error)?.error ??
    (canReadMeters ? observationQuery.error : null);
  const loading =
    !!v &&
    !!user &&
    (access.isPending ||
      queries.some((q, i) => canRead(kinds[i]) && q.isPending) ||
      (canReadMeters && observationQuery.isPending));
  const includedKinds = kinds.filter(canRead);
  const report =
    v && access.data?.["reports.read"]
      ? buildReport({
          vehicle: v,
          period,
          generatedAt: new Date().toISOString(),
          records: kinds.flatMap((kind, index) =>
            canRead(kind)
              ? (queries[index].data ?? []).map((row) => ({ ...row, kind }))
              : [],
          ),
          observations: canReadMeters ? (observationQuery.data ?? []) : [],
          includedKinds,
          canReadMeters,
        })
      : null;
  const exportData = async (format: ExportFormat) => {
    if (
      !v ||
      !user ||
      loading ||
      queryError ||
      busy ||
      !access.data?.["reports.read"]
    )
      return;
    setBusy(true);
    setError("");
    setFailedFormat(null);
    try {
      const permissions = await verifyAccess(v.id, development);
      if (!permissions["reports.read"]) throw new Error(r("permission"));
      const allowed = kinds.filter((kind) => permissions[readPermission(kind)]);
      const records = (
        await Promise.all(
          allowed.map(async (kind) =>
            (await listRecords(user, v.id, kind, development)).map((row) => ({
              ...row,
              kind,
            })),
          ),
        )
      ).flat();
      const meterAllowed = permissions["meters.read"] === true;
      const observations = meterAllowed
        ? await loadObservations(user, v.id, development)
        : [];
      const snapshot = buildReport({
        vehicle: v,
        period,
        generatedAt: new Date().toISOString(),
        records,
        observations,
        includedKinds: allowed,
        canReadMeters: meterAllowed,
      });
      const currentPermissions = await verifyAccess(v.id, development);
      if (
        !currentPermissions["reports.read"] ||
        allowed.some((kind) => !currentPermissions[readPermission(kind)]) ||
        (meterAllowed && !currentPermissions["meters.read"])
      )
        throw new Error(
          "Your access changed while preparing the report. Refresh and try again.",
        );
      const name = `GaadiPulse-${v.id}-${period}-${snapshot.generated_at.slice(0, 10)}`;
      if (format === "json")
        await exportText(
          JSON.stringify(snapshot, null, 2),
          `${name}.json`,
          "application/json",
        );
      else if (format === "csv")
        await exportText(
          reportCsv(snapshot),
          `${name}.csv`,
          "text/csv;charset=utf-8",
        );
      else await exportPdf(reportHtml(snapshot));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFailedFormat(format);
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
      loading={loading || busy}
      banner="reports"
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
            onChange={(value) => setPeriod(value as InsightPeriod)}
          />
          {queryError ? (
            <ErrorState
              message={queryError.message}
              retry={() =>
                void Promise.all([
                  ...queries
                    .filter((_, index) => canRead(kinds[index]))
                    .map((q) => q.refetch()),
                  ...(canReadMeters ? [observationQuery.refetch()] : []),
                ])
              }
            />
          ) : (
            <>
              <Card style={{ padding: 16 }}>
                <SectionHeading title="Export report" />
                <AppText muted>
                  Includes the selected period’s authorized records, meter
                  readings and completed intervals. JSON keeps full detail; CSV
                  is ready for spreadsheet analysis; PDF is formatted for
                  reading and printing.
                </AppText>
                <ExportActions
                  disabled={busy || loading || !report}
                  onExport={(format) => void exportData(format)}
                />
              </Card>
              {report && (
                <Card style={{ padding: 16 }}>
                  <SectionHeading title="Report summary" />
                  <AppText muted>
                    {report.period.start_date
                      ? `${report.period.start_date} to ${report.period.end_date}`
                      : "All time"}{" "}
                    · {report.period.timezone}
                  </AppText>
                  <InfoRows
                    items={[
                      {
                        label: r("cash"),
                        value: money(report.summary.cash_paise),
                      },
                      {
                        label: r("operating"),
                        value: money(report.summary.operating_paise),
                      },
                      {
                        label: r("financing"),
                        value: money(report.summary.financing_paise),
                      },
                      {
                        label: r("unclassified"),
                        value: money(report.summary.unclassified_paise),
                      },
                      {
                        label: r("confirmed"),
                        value: String(report.summary.record_count),
                      },
                      {
                        label: "Meter observations",
                        value: String(report.meter_observations.length),
                      },
                      {
                        label: "Fuel intervals",
                        value: String(report.fuel_intervals.length),
                      },
                      {
                        label: "Measured intervals",
                        value: String(report.measured_intervals.length),
                      },
                    ]}
                  />
                  <AppText muted>
                    Included record types:{" "}
                    {report.included_record_types.join(", ") || "none"}. Totals
                    reflect only accessible data. Intervals are included by
                    their closing date and may start before this period.
                  </AppText>
                </Card>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <ErrorState
          message={error}
          retry={() => {
            if (failedFormat) void exportData(failedFormat);
          }}
        />
      )}
    </Screen>
  );
}
