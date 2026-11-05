import { ScrollView, Text, View } from "react-native";
import { Svg, Rect, Line } from "react-native-svg";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Screen, Card, AppText, ErrorState } from "@/src/components/ui";
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
import { money } from "@/src/utils/money";
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
  const max = Math.max(0, ...bars.map((bar) => bar.value ?? 0));
  const width = Math.max(280, bars.length * 58);
  return (
    <>
      <AppText muted>{unit} · Scroll horizontally to see all bars</AppText>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        accessibilityLabel={`${unit} chart. Details follow below.`}
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
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
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
    perms.error ||
    queries.some((q, i) => canRead(kinds[i]) && q.error) ||
    (canMeasure && meterQuery.error);
  const loading =
    perms.isPending ||
    queries.some((q, i) => !!vehicle && canRead(kinds[i]) && q.isPending) ||
    (!!vehicle && canMeasure && meterQuery.isPending);
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
  const intervals = canMeasure
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
  const selectedIntervals = intervals.filter((x) => inPeriod(x.to));
  const selectedMeasured = measured.filter((x) => inPeriod(x.to));
  const total = selected.reduce(
    (sum, x) => sum + Number(x.payload.amount_paise ?? 0),
    0,
  );
  const spendBars = buckets.map((b) => {
    const value = selected
      .filter((x) => bucketKey(timestamp(x), zone, period) === b.key)
      .reduce((sum, x) => sum + Number(x.payload.amount_paise ?? 0), 0);
    return { ...b, value, display: money(value) };
  });
  const categories = [
    ...new Set(
      selected
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
        .reduce((sum, x) => sum + Number(x.payload.amount_paise ?? 0), 0),
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
    <Screen title="Insights" compact loading={loading}>
      <VehicleHeader />
      <AppText muted>
        {vehicle?.nickname ?? "Selected vehicle"} · Explore real recorded data
      </AppText>
      <FilterChips
        items={[
          { id: "week", label: "This week" },
          { id: "month", label: "This month" },
          { id: "year", label: "This year" },
          { id: "all", label: "All time" },
        ]}
        value={period}
        onChange={(value) => setPeriod(value as InsightPeriod)}
      />
      {errors ? (
        <ErrorState
          message="Some insight data could not be loaded."
          retry={() => {
            void perms.refetch();
            void Promise.all([
              ...queries
                .filter((_, i) => canRead(kinds[i]))
                .map((q) => q.refetch()),
              ...(canMeasure ? [meterQuery.refetch()] : []),
            ]);
          }}
        />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Card style={{ flex: 1, padding: 14 }}>
              <AppText muted>Total recorded spend</AppText>
              <AppText large>{money(total)}</AppText>
            </Card>
            <Card style={{ flex: 1, padding: 14 }}>
              <AppText muted>Completed fuel intervals</AppText>
              <AppText large>
                {String(
                  selectedIntervals.filter(
                    (x) => x.kmPerUnit !== null || x.unitsPerHour !== null,
                  ).length,
                )}
              </AppText>
            </Card>
          </View>
          <Card>
            <AppText large>Recorded spend</AppText>
            {spendBars.length ? (
              <Chart
                bars={spendBars}
                color={theme.primary}
                unit="Fuel and expenses · INR"
              />
            ) : (
              <AppText muted>No records for this period.</AppText>
            )}
          </Card>
          <Card>
            <AppText large>Expense categories</AppText>
            {categories.length ? (
              <Chart
                bars={categories.map((x, i) => ({
                  label: String(i + 1),
                  description: x.name,
                  value: x.value,
                  display: money(x.value),
                }))}
                color="#F0A648"
                unit="Expenses · INR"
              />
            ) : (
              <AppText muted>No expense records in this period.</AppText>
            )}
          </Card>
          <Card>
            <AppText large>Fuel efficiency</AppText>
            <AppText muted>
              Full-to-full intervals are grouped by their closing fill date. An
              interval can cover several days; it does not measure each day
              separately. Averages use total distance or hours and total fuel
              for qualifying intervals.
            </AppText>
            {metrics.length ? (
              metrics.map((metric) => {
                const [type, unit] = metric.split("|");
                const mode = type as "distance" | "hours";
                const rows = selectedIntervals.filter((x) => x.unit === unit);
                const average = efficiencyAverage(rows, mode);
                const unitLabel =
                  mode === "distance" ? `KM / ${unit}` : `${unit} / hour`;
                return (
                  <View key={metric} style={{ gap: 12 }}>
                    <AppText large>
                      Average: {average?.toFixed(2)} {unitLabel}
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
                              ? "No interval"
                              : `${value.toFixed(2)} ${unitLabel}`,
                        };
                      })}
                    />
                  </View>
                );
              })
            ) : (
              <AppText muted>
                No qualifying full-to-full intervals completed in this period.
                Fuel and matching meter readings are required.
              </AppText>
            )}
          </Card>
          <Card>
            <AppText large>Measured distance and use</AppText>
            <AppText muted>
              Each bar represents the change between two actual readings,
              grouped by the later reading date.
            </AppText>
            {selectedMeasured.length ? (
              (["KM", "HOURS"] as const).map((type) => {
                const rows = selectedMeasured.filter((x) => x.type === type);
                return rows.length ? (
                  <Chart
                    key={type}
                    color="#7774D6"
                    unit={`Measured ${type}`}
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
