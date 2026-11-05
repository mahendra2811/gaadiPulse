import { View, Text } from "react-native";
import Svg, { Rect, Line, Circle, Polyline } from "react-native-svg";
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
import { expenseAccounting } from "@/src/utils/expenseAccounting";
import { useTheme } from "@/src/lib/theme";
const kinds = ["fuel", "expenses", "meters"] as const;
function Bars({ values, colors }: { values: number[]; colors: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <Svg
      width="100%"
      height="154"
      viewBox={`0 0 ${Math.max(values.length * 54, 280)} 154`}
    >
      <Line
        x1="0"
        y1="130"
        x2={Math.max(values.length * 54, 280)}
        y2="130"
        stroke="#CBD5D1"
      />
      {values.map((v, i) => (
        <Rect
          key={i}
          x={i * 54 + 12}
          y={130 - (v / max) * 108}
          width="30"
          height={Math.max(2, (v / max) * 108)}
          rx="7"
          fill={colors[i % colors.length]}
        />
      ))}
    </Svg>
  );
}
export function Insights() {
  const active = useActiveVehicle(),
    vehicle = active.vehicle,
    user = useAccountId(),
    { development } = useSession(),
    perms = usePermissions(vehicle?.id),
    theme = useTheme();
  const [period, setPeriod] = useState("month");
  const queries = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: [user, vehicle?.id, "insights", kind],
      enabled:
        !!user &&
        !!vehicle &&
        perms.data?.["reports.read"] === true &&
        perms.data?.[readPermission(kind)] === true,
      queryFn: () => listRecords(user!, vehicle!.id, kind, development),
    })),
  });
  const meterQuery = useQuery({
    queryKey: [user, vehicle?.id, "observations"],
    enabled: !!user && !!vehicle && perms.data?.["meters.read"] === true,
    queryFn: () => observations(user!, vehicle!.id, development),
  });
  const errors = queries.some((q) => q.error) || meterQuery.error;
  const loading = queries.some((q) => q.isPending) || meterQuery.isPending;
  const records = queries
    .flatMap((q, index) =>
      (q.data ?? []).map((x) => ({ ...x, kind: kinds[index] })),
    )
    .filter((x) => x.status !== "ARCHIVED");
  const expenses = records.filter((x) => x.kind === "expenses");
  const categories = [
    ...new Set(expenses.map((x) => String(x.payload.category ?? "OTHER"))),
  ]
    .map((c) => ({
      name: c,
      value: expenses
        .filter((x) => String(x.payload.category ?? "OTHER") == c)
        .reduce((s, x) => s + Number(x.payload.amount_paise ?? 0), 0),
    }))
    .sort((a, b) => b.value - a.value);
  const fuel = records.filter((x) => x.kind === "fuel");
  const spendByMonth = Array.from(
    { length: period === "week" ? 7 : period === "month" ? 4 : 12 },
    (_, i) => {
      const now = new Date();
      const d = new Date(now);
      if (period === "week") d.setDate(now.getDate() - (6 - i));
      else if (period === "month") d.setDate(1 + i * 7);
      else d.setMonth(now.getMonth() - (11 - i));
      const sameBucket = (value: Date) =>
        period === "week"
          ? value.toDateString() === d.toDateString()
          : period === "month"
            ? value.getFullYear() === now.getFullYear() &&
              value.getMonth() === now.getMonth() &&
              Math.floor((value.getDate() - 1) / 7) === i
            : value.getFullYear() === d.getFullYear() &&
              value.getMonth() === d.getMonth();
      return {
        label:
          period === "week"
            ? d.toLocaleDateString("en", { weekday: "short" })
            : period === "month"
              ? `W${i + 1}`
              : d.toLocaleDateString("en", { month: "short" }),
        value: [...fuel, ...expenses]
          .filter((x) =>
            sameBucket(new Date(String(x.payload.event_at ?? x.created_at))),
          )
          .reduce((sum, x) => sum + Number(x.payload.amount_paise ?? 0), 0),
      };
    },
  );
  const intervals = perms.data?.["meters.read"]
    ? fuelIntervals(
        fuel.map((x) => ({ id: x.id, ...x.payload }) as FuelPoint),
        meterQuery.data ?? [],
      )
    : [];
  const measured = measuredIntervals(meterQuery.data ?? []).filter(
    (x) => !x.anomaly,
  );
  const efficiency = intervals
    .map((x) => x.kmPerUnit)
    .filter((x): x is number => x !== null);
  const total = [...fuel, ...expenses]
    .filter((x) => {
      const d = new Date(String(x.payload.event_at ?? x.created_at));
      const now = new Date();
      return (
        period === "all" ||
        (period === "week" && now.getTime() - d.getTime() < 7 * 86400000) ||
        (period === "month" &&
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()) ||
        (period === "year" && d.getFullYear() === now.getFullYear())
      );
    })
    .reduce((s, x) => s + Number(x.payload.amount_paise ?? 0), 0);
  const colors = [theme.primary, "#22A783", "#F0A648", "#7774D6", "#E36B70"];
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
        onChange={setPeriod}
      />
      {errors ? (
        <ErrorState
          message="Some insight data could not be loaded."
          retry={() => {
            void Promise.all([
              ...queries.map((q) => q.refetch()),
              meterQuery.refetch(),
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
              <AppText muted>Valid fuel intervals</AppText>
              <AppText large>{String(efficiency.length)}</AppText>
            </Card>
          </View>
          <Card>
            <AppText large>Spend by month</AppText>
            <Bars values={spendByMonth.map((x) => x.value)} colors={colors} />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {spendByMonth.map((x) => (
                <Text
                  key={x.label}
                  style={{ color: theme.muted, fontSize: 12 }}
                >
                  {x.label}
                </Text>
              ))}
            </View>
          </Card>
          <Card>
            <AppText large>Expense categories</AppText>
            {categories.length ? (
              <>
                <Bars values={categories.map((x) => x.value)} colors={colors} />
                {categories.map((x, i) => (
                  <View
                    key={x.name}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <AppText>{x.name}</AppText>
                    <AppText>{money(x.value)}</AppText>
                  </View>
                ))}
              </>
            ) : (
              <AppText muted>No expense records in this vehicle yet.</AppText>
            )}
          </Card>
          <Card>
            <AppText large>Fuel efficiency</AppText>
            {efficiency.length ? (
              <>
                <Bars values={efficiency} colors={["#22A783"]} />
                {efficiency.slice(-8).map((x, i) => (
                  <AppText key={i}>{x.toFixed(2)} KM per unit</AppText>
                ))}
              </>
            ) : (
              <AppText muted>
                Efficiency appears after valid full-to-full fuel intervals with
                meter readings.
              </AppText>
            )}
          </Card>
          <Card>
            <AppText large>Measured distance and use</AppText>
            {measured.length ? (
              <>
                <Bars
                  values={measured.slice(-8).map((x) => x.delta)}
                  colors={["#7774D6"]}
                />
                {measured.slice(-8).map((x, i) => (
                  <AppText key={i}>
                    {x.delta} {x.type} · {new Date(x.to).toLocaleDateString()}
                  </AppText>
                ))}
              </>
            ) : (
              <AppText muted>
                Add dated meter readings to see measured distance or hours.
              </AppText>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
