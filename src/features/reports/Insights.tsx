import { Pressable, ScrollView, Text, View } from "react-native";
import { Svg, Rect, Line } from "react-native-svg";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Screen, Card, AppText, ErrorState } from "@/src/components/ui";
import { PageSkeleton } from "@/src/components/ui/PageSkeleton";
import { r, recordCopy } from "@/src/features/records/copy";
import { t } from "@/src/lib/i18n";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { listRecords, readPermission } from "@/src/features/records/api";
import { usePermissions } from "@/src/features/records/hooks";
import { observations } from "@/src/features/meters/api";
import { useQuery } from "@/src/lib/query";
import { measuredIntervals } from "@/src/utils/meter";
import { fuelIntervals, type FuelPoint } from "@/src/utils/fuelEconomy";
import { moneyIn } from "@/src/utils/money";
import {
  recordCurrency,
  recordMinorAmount,
} from "@/src/features/records/currency";
import { useTheme } from "@/src/lib/theme";
import { dateInZone } from "@/src/features/progress/schema";
import {
  bucketKey,
  efficiencyAverage,
  insightBuckets,
  type InsightPeriod,
} from "./insightPeriods";

const kinds = ["fuel", "expenses"] as const;
type Bar = {
  label: string;
  description: string;
  value: number | null;
  display: string;
};
function Chart({
  bars,
  color,
  unit,
}: {
  bars: Bar[];
  color: string;
  unit: string;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(0, ...bars.map((bar) => bar.value ?? 0));
  const width = Math.max(280, bars.length * 58);
  return (
    <>
      <AppText muted>{unit} · Scroll horizontally to see all bars</AppText>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        accessibilityLabel={`${unit} chart.`}
      >
        <View style={{ width }}>
          <Svg width={width} height={145}>
            <Line x1="0" y1="120" x2={width} y2="120" stroke={theme.line} />
            {bars.map(
              (bar, i) =>
                bar.value !== null && (
                  <Rect
                    key={i}
                    x={i * 58 + 14}
                    y={120 - (max ? (bar.value / max) * 100 : 0)}
                    width="30"
                    height={Math.max(2, max ? (bar.value / max) * 100 : 0)}
                    rx="5"
                    fill={color}
                  />
                ),
            )}
          </Svg>
          <View style={{ flexDirection: "row" }}>
            {bars.map((bar, i) => (
              <Text
                key={i}
                style={{
                  width: 58,
                  textAlign: "center",
                  color: theme.muted,
                  fontSize: 12,
                }}
              >
                {bar.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? t("insightsChartHideDetails") : t("insightsChartShowDetails")}: ${unit}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={{ color: theme.primary, fontWeight: "600" }}>
          {expanded
            ? t("insightsChartHideDetails")
            : t("insightsChartShowDetails")}
        </Text>
      </Pressable>
      {expanded &&
        bars.map((bar, i) => (
          <View
            key={`${bar.label}-${i}`}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
            accessible
            accessibilityLabel={`${bar.label}, ${bar.description}: ${bar.display}`}
          >
            <Text style={{ color: theme.ink, flex: 1 }}>
              {bar.label} · {bar.description}
            </Text>
            <Text style={{ color: theme.ink }}>{bar.display}</Text>
          </View>
        ))}
    </>
  );
}
export function Insights() {
  const active = useActiveVehicle(),
    vehicle = active.vehicle,
    user = useAccountId(),
    { development } = useSession(),
    perms = usePermissions(vehicle?.id),
    theme = useTheme();
  const [period, setPeriod] = useState<InsightPeriod>("month");
  const canRead = (kind: (typeof kinds)[number]) =>
    perms.data?.["reports.read"] === true &&
    perms.data?.[readPermission(kind)] === true;
  const queries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: [user, vehicle?.id, "insights", kind],
      enabled: !!user && !!vehicle && canRead(kind),
      queryFn: () => listRecords(user!, vehicle!.id, kind, development),
    })),
  });
  const canMeasure =
    perms.data?.["reports.read"] === true &&
    perms.data?.["meters.read"] === true;
  const meterQuery = useQuery({
    queryKey: [user, vehicle?.id, "observations"],
    enabled: !!user && !!vehicle && canMeasure,
    queryFn: () => observations(user!, vehicle!.id, development),
  });
  const errors =
    active.error ||
    perms.error ||
    queries.some((q, i) => canRead(kinds[i]) && q.error) ||
    (canMeasure && meterQuery.error);
  const loading =
    (!!user && active.isPending) ||
    (!!user &&
      !!vehicle &&
      (perms.isPending ||
        queries.some((q, i) => canRead(kinds[i]) && q.isPending) ||
        (canMeasure && meterQuery.isPending)));
  const hasSpendAccess = canRead("fuel") || canRead("expenses");
  const canCalculateEfficiency = canRead("fuel") && canMeasure;
  const readableTypes = [
    canRead("fuel") ? r("fuel") : null,
    canRead("expenses") ? r("expenses") : null,
    canMeasure ? r("meters") : null,
  ].filter((name) => name !== null);
  const records = queries.flatMap((q, i) =>
    canRead(kinds[i])
      ? (q.data ?? [])
          .filter((x) => x.status !== "ARCHIVED")
          .map((x) => ({ ...x, kind: kinds[i] }))
      : [],
  );
  const fuel = records.filter((x) => x.kind === "fuel");
  const zone = vehicle?.timezone ?? "Asia/Kolkata";
  const timestamp = (x: (typeof records)[number]) =>
    String(x.payload.event_at ?? x.created_at);
  const intervals = canCalculateEfficiency
    ? fuelIntervals(
        fuel.map((x) => ({ id: x.id, ...x.payload }) as FuelPoint),
        meterQuery.data ?? [],
      )
    : [];
  const measured = canMeasure
    ? measuredIntervals(meterQuery.data ?? [])
        .filter((x) => !x.anomaly)
        .sort((a, b) => a.to.localeCompare(b.to))
    : [];
  const today = dateInZone(new Date(), zone);
  const dates = [
    ...records.map(timestamp),
    ...intervals.map((x) => x.to),
    ...measured.map((x) => x.to),
  ].map((x) => dateInZone(new Date(x), zone));
  const buckets = insightBuckets(period, today, dates);
  const keys = new Set(buckets.map((x) => x.key));
  const inPeriod = (date: string) => keys.has(bucketKey(date, zone, period));
  const selected = records.filter((x) => inPeriod(timestamp(x)));
  const currency = vehicle?.default_currency_code ?? "INR";
  const selectedSpend = selected.filter(
    (x) => recordCurrency(x.payload) === currency,
  );
  const selectedIntervals = intervals.filter((x) => inPeriod(x.to));
  const selectedMeasured = measured.filter((x) => inPeriod(x.to));
  const total = selectedSpend.reduce(
    (sum, x) => sum + recordMinorAmount(x.payload),
    0,
  );
  const spendBars = buckets.map((b) => {
    const value = selected
      .filter(
        (x) =>
          bucketKey(timestamp(x), zone, period) === b.key &&
          recordCurrency(x.payload) === currency,
      )
      .reduce((sum, x) => sum + recordMinorAmount(x.payload), 0);
    return { ...b, value, display: moneyIn(value, currency) };
  });
  const categories = [
    ...new Set(
      selectedSpend
        .filter((x) => x.kind === "expenses")
        .map((x) => String(x.payload.category ?? "OTHER")),
    ),
  ]
    .map((name) => ({
      name,
      value: selected
        .filter(
          (x) =>
            x.kind === "expenses" &&
            String(x.payload.category ?? "OTHER") === name,
        )
        .reduce((sum, x) => sum + recordMinorAmount(x.payload), 0),
    }))
    .sort((a, b) => b.value - a.value);
  const metrics = [
    ...new Set(
      selectedIntervals
        .flatMap((x) => [
          x.kmPerUnit !== null ? `distance|${x.unit}` : null,
          x.unitsPerHour !== null ? `hours|${x.unit}` : null,
        ])
        .filter((x): x is string => x !== null),
    ),
  ];
  return (
    <Screen title={t("insightsTitle")} compact loading={loading}>
      {!!vehicle && <VehicleHeader />}
      {!!vehicle && (
        <AppText muted>
          {vehicle.nickname ?? t("reportSelectedVehicle")} ·{" "}
          {t("reportExploreData")}
        </AppText>
      )}
      {!!vehicle && (
        <FilterChips
          items={[
            { id: "week", label: t("reportThisWeek") },
            { id: "month", label: t("reportThisMonth") },
            { id: "year", label: t("reportThisYear") },
            { id: "all", label: t("reportAllTime") },
          ]}
          value={period}
          onChange={(value) => setPeriod(value as InsightPeriod)}
        />
      )}
      {errors ? (
        <ErrorState
          message={t("insightsLoadError")}
          retry={() => {
            if (active.error) void active.refetch();
            if (vehicle) void perms.refetch();
            void Promise.all([
              ...queries
                .filter((_, i) => canRead(kinds[i]))
                .map((q) => q.refetch()),
              ...(canMeasure ? [meterQuery.refetch()] : []),
            ]);
          }}
        />
      ) : loading ? (
        <PageSkeleton shape="dashboard" />
      ) : !vehicle ? (
        <AppText muted>{r("noVehicle")}</AppText>
      ) : !perms.data?.["reports.read"] ? (
        <AppText muted>{t("insightsNoReportAccess")}</AppText>
      ) : (
        <>
          <AppText muted>
            {t("insightsScope")}{" "}
            {readableTypes.length ? readableTypes.join(", ") : "—"}.
          </AppText>
          {(hasSpendAccess || canCalculateEfficiency) && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {hasSpendAccess && (
                <Card style={{ flexBasis: "45%", flexGrow: 1, padding: 14 }}>
                  <AppText muted>{t("reportTotalSpend")}</AppText>
                  <AppText large>{moneyIn(total, currency)}</AppText>
                </Card>
              )}
              {canCalculateEfficiency && (
                <Card style={{ flexBasis: "45%", flexGrow: 1, padding: 14 }}>
                  <AppText muted>{t("reportCompletedFuelIntervals")}</AppText>
                  <AppText large>
                    {String(
                      selectedIntervals.filter(
                        (x) => x.kmPerUnit !== null || x.unitsPerHour !== null,
                      ).length,
                    )}
                  </AppText>
                </Card>
              )}
            </View>
          )}
          <Card>
            <AppText large>{t("reportRecordedSpend")}</AppText>
            {!hasSpendAccess ? (
              <AppText muted>{t("insightsNoRecordsAccess")}</AppText>
            ) : selected.length && spendBars.length ? (
              <Chart
                bars={spendBars}
                color={theme.primary}
                unit={`${[canRead("fuel") ? r("fuel") : null, canRead("expenses") ? r("expenses") : null].filter(Boolean).join(" + ")} · ${currency}`}
              />
            ) : (
              <AppText muted>{t("reportNoRecords")}</AppText>
            )}
          </Card>
          <Card>
            <AppText large>{t("reportExpenseCategories")}</AppText>
            {!canRead("expenses") ? (
              <AppText muted>{t("insightsNoExpenseAccess")}</AppText>
            ) : categories.length ? (
              <Chart
                bars={categories.map((x, i) => ({
                  label: String(i + 1),
                  description: r(x.name as keyof typeof recordCopy) ?? x.name,
                  value: x.value,
                  display: moneyIn(x.value, currency),
                }))}
                color="#F0A648"
                unit={t("insightsExpensesUnit").replace("{currency}", currency)}
              />
            ) : (
              <AppText muted>{t("reportNoExpenses")}</AppText>
            )}
          </Card>
          <Card>
            <AppText large>{t("reportFuelEfficiency")}</AppText>
            <AppText muted>{t("insightsFullToFullHelp")}</AppText>
            {!canRead("fuel") ? (
              <AppText muted>{t("insightsNoFuelAccess")}</AppText>
            ) : !canMeasure ? (
              <AppText muted>{t("insightsNoMeterAccess")}</AppText>
            ) : metrics.length ? (
              metrics.map((metric) => {
                const [type, unit] = metric.split("|");
                const mode = type as "distance" | "hours";
                const rows = selectedIntervals.filter((x) => x.unit === unit);
                const average = efficiencyAverage(rows, mode);
                const unitLabel =
                  mode === "distance"
                    ? t("insightsDistancePerUnit").replace("{unit}", unit)
                    : t("insightsUnitsPerHour").replace("{unit}", unit);
                return (
                  <View key={metric} style={{ gap: 12 }}>
                    <AppText large>
                      {t("insightsAverage")
                        .replace("{value}", average?.toFixed(2) ?? "—")
                        .replace("{unit}", unitLabel)}
                    </AppText>
                    <Chart
                      color="#22A783"
                      unit={unitLabel}
                      bars={buckets.map((b) => {
                        const value = efficiencyAverage(
                          rows.filter(
                            (x) => bucketKey(x.to, zone, period) === b.key,
                          ),
                          mode,
                        );
                        return {
                          ...b,
                          value,
                          display:
                            value === null
                              ? t("reportNoInterval")
                              : `${value.toFixed(2)} ${unitLabel}`,
                        };
                      })}
                    />
                  </View>
                );
              })
            ) : (
              <AppText muted>{t("insightsNoQualifyingIntervals")}</AppText>
            )}
          </Card>
          <Card>
            <AppText large>{t("reportMeasuredDistance")}</AppText>
            <AppText muted>{t("insightsMeasuredHelp")}</AppText>
            {!canMeasure ? (
              <AppText muted>{t("insightsNoMeterAccess")}</AppText>
            ) : selectedMeasured.length ? (
              (["KM", "HOURS"] as const).map((type) => {
                const rows = selectedMeasured.filter((x) => x.type === type);
                return rows.length ? (
                  <Chart
                    key={type}
                    color="#7774D6"
                    unit={t("insightsMeasuredUnit").replace("{type}", type)}
                    bars={rows.map((x, i) => ({
                      label: String(i + 1),
                      description: `${dateInZone(new Date(x.from), zone)} to ${dateInZone(new Date(x.to), zone)}`,
                      value: x.delta,
                      display: `${x.delta} ${x.type}`,
                    }))}
                  />
                ) : null;
              })
            ) : (
              <AppText muted>
                No measured intervals completed in this period.
              </AppText>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
