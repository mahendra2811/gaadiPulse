import { PageSkeleton } from "@/src/components/ui/PageSkeleton";
import { releaseFeatures } from "@/src/features/release/scope";
import { useState } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useReminderReconciliation } from "@/src/features/reminders/useReminders";
import { isPilotHistoryVisible } from "@/src/features/members/history";
import { useCurrentTime } from "@/src/hooks/useCurrentTime";
import { Card, AppText, ErrorState } from "@/src/components/ui";
import {
  Expandable,
  ActionTile,
  MenuRow,
  MotionPress,
  SectionHeading,
  TextAction,
  type IconName,
  type IconTone,
} from "@/src/components/ui/premium";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useRecords, usePermissions } from "@/src/features/records/hooks";
import { useFuelHistory } from "@/src/features/records/useFuelHistory";
import { useRecentFuel } from "./useRecentFuel";
import { compareRecentEvents } from "./recentFuel";
import { r } from "@/src/features/records/copy";
import { moneyIn } from "@/src/utils/money";
import {
  recordMoney,
  recordMinorAmount,
  recordCurrency,
} from "@/src/features/records/currency";
import { dateInZone } from "@/src/features/progress/schema";
import { useTheme } from "@/src/lib/theme";
import { formatDate, t } from "@/src/lib/i18n";
export function Dashboard() {
  return releaseFeatures.advancedTools ? (
    <AdvancedDashboard />
  ) : (
    <BasicDashboard />
  );
}
function BasicDashboard() {
  const active = useActiveVehicle();
  return (
    <DashboardContent
      key={active.vehicle?.id ?? "none"}
      reminderStatus={null}
    />
  );
}
function AdvancedDashboard() {
  const reminderStatus = useReminderReconciliation();
  const active = useActiveVehicle();
  // A fresh instance resets expanded sections when the selected vehicle changes.
  return (
    <DashboardContent
      key={active.vehicle?.id ?? "none"}
      reminderStatus={reminderStatus}
    />
  );
}
function DashboardContent({
  reminderStatus,
}: {
  reminderStatus: Pick<
    ReturnType<typeof useReminderReconciliation>,
    "error" | "retry"
  > | null;
}) {
  const { vehicle } = useActiveVehicle();
  const permissions = usePermissions(vehicle?.id);
  const expenses = useRecords("expenses");
  const reminders = useRecords("reminders");
  const now = useCurrentTime();
  const c = useTheme();
  const [moreActions, setMoreActions] = useState(false);
  const [moreActivity, setMoreActivity] = useState(false);
  const month = dateInZone(
    new Date(now),
    vehicle?.timezone ?? "Asia/Kolkata",
  ).slice(0, 7);
  const [monthYear, monthNumber] = month.split("-").map(Number);
  const monthEnd = `${month}-${String(new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
  const fuel = useRecentFuel(vehicle, !!permissions.data?.["fuel.read"], now);
  const monthlyFuel = useFuelHistory(
    vehicle?.id,
    !!permissions.data?.owner && !!permissions.data["fuel.read"],
    true,
    {
      start: `${month}-01`,
      end: monthEnd,
      min: null,
      max: null,
      search: "",
      timezone: vehicle?.timezone ?? "Asia/Kolkata",
      currency: vehicle?.default_currency_code,
    },
  );
  const total = (entries: typeof expenses.data) =>
    entries
      ?.filter(
        (row) =>
          row.status !== "ARCHIVED" &&
          dateInZone(
            new Date(String(row.payload.event_at)),
            vehicle?.timezone ?? "Asia/Kolkata",
          ).startsWith(month),
      )
      .filter(
        (row) =>
          recordCurrency(row.payload) ===
          (vehicle?.default_currency_code ?? "INR"),
      )
      .reduce((sum, row) => sum + recordMinorAmount(row.payload), 0) ?? 0;
  const navigate = (kind: string, action?: string) =>
    router.push(
      action
        ? {
            pathname: "/records/[kind]/[action]",
            params: { kind, action, vehicle: vehicle?.id },
          }
        : { pathname: "/records/[kind]", params: { kind } },
    );
  type Action = {
    label: string;
    icon: IconName;
    tone: IconTone;
    show?: boolean;
    run: () => void;
  };
  const primary = (
    [
      {
        label: t(
          vehicle?.energy_type === "ELECTRIC" ? "addCharging" : "uiAddFuel",
        ),
        icon: "water",
        tone: "blue",
        show: !!permissions.data?.["fuel.create"],
        run: () => navigate("fuel", "add"),
      },
      {
        label: t("uiAddExpense"),
        icon: "receipt",
        tone: "amber",
        show: !!permissions.data?.["expenses.create"],
        run: () => navigate("expenses", "add"),
      },
      {
        label: r("addMeter"),
        icon: "speedometer",
        tone: "cyan",
        show: !!permissions.data?.["meters.create"],
        run: () => navigate("meters", "add"),
      },
    ] satisfies Action[]
  ).filter((action) => action.show);
  const secondary = (
    [
      {
        label: r("documents"),
        icon: "documents",
        tone: "amber",
        show: !!permissions.data?.["documents.read"],
        run: () => navigate("documents"),
      },
      {
        label: r("reports"),
        icon: "stats-chart",
        tone: "blue",
        show: !!permissions.data?.["reports.read"],
        run: () => router.push("/reports"),
      },
      {
        label: r("members"),
        icon: "people",
        tone: "coral",
        show: !!permissions.data?.owner,
        run: () => router.push("/owner/members"),
      },
    ] satisfies Action[]
  ).filter((action) => action.show);
  const enabledSecondary = releaseFeatures.advancedTools ? secondary : [];
  const activity = [
    ...(permissions.data?.["fuel.read"] ? (fuel.data ?? []) : []).map(
      (row) => ({
        ...row,
        kind: "fuel",
      }),
    ),
    ...(permissions.data?.["expenses.read"] ? (expenses.data ?? []) : []).map(
      (row) => ({
        ...row,
        kind: "expenses",
      }),
    ),
  ]
    .filter(
      (row) =>
        row.status !== "ARCHIVED" &&
        (vehicle?.role !== "PILOT" ||
          isPilotHistoryVisible(
            String(row.payload.event_at),
            vehicle.timezone,
            now,
          )),
    )
    .sort((a, b) => compareRecentEvents(a, b) || b.kind.localeCompare(a.kind));
  const upcoming =
    reminders.data
      ?.filter((row) => row.status === "ACTIVE")
      .sort(
        (a, b) =>
          (a.payload.due_at ? Date.parse(String(a.payload.due_at)) : Infinity) -
          (b.payload.due_at ? Date.parse(String(b.payload.due_at)) : Infinity),
      ) ?? [];
  const completedReminders =
    reminders.data
      ?.filter((row) => row.status === "COMPLETED")
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)) ??
    [];
  if (permissions.isPending && vehicle)
    return <PageSkeleton shape="dashboard" />;
  const activityPending =
    (!!permissions.data?.["fuel.read"] && fuel.isPending && !fuel.error) ||
    (!!permissions.data?.["expenses.read"] &&
      expenses.isPending &&
      !expenses.error);
  return (
    <>
      {permissions.error && (
        <ErrorState
          message={permissions.error.message}
          retry={() => void permissions.refetch()}
        />
      )}
      <SectionHeading title={t("uiQuickActions")} />
      {primary.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {primary.map((action) => (
            <ActionTile
              key={action.label}
              label={action.label}
              icon={action.icon}
              tone={action.tone}
              onPress={action.run}
            />
          ))}
        </View>
      ) : (
        permissions.data && <AppText muted>{t("uiNoQuickActions")}</AppText>
      )}
      {!!enabledSecondary.length && (
        <>
          <MotionPress
            label={t(moreActions ? "uiFewerActions" : "uiMoreActions")}
            expanded={moreActions}
            onPress={() => setMoreActions((value) => !value)}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                minHeight: 56,
              }}
            >
              <Text
                style={{ color: c.primary, fontSize: 14, fontWeight: "700" }}
              >
                {t(moreActions ? "uiFewerActions" : "uiMoreActions")}
              </Text>
              <Ionicons
                name={moreActions ? "chevron-up" : "chevron-down"}
                color={c.primary}
                size={18}
              />
            </View>
          </MotionPress>
          <Expandable expanded={moreActions}>
            <Card style={{ paddingVertical: 6 }}>
              {enabledSecondary.map((action) => (
                <MenuRow
                  key={action.label}
                  label={action.label}
                  icon={action.icon}
                  tone={action.tone}
                  onPress={action.run}
                />
              ))}
            </Card>
          </Expandable>
        </>
      )}
      {permissions.data?.owner &&
        (permissions.data?.["fuel.read"] ||
          permissions.data?.["expenses.read"]) && (
          <>
            <SectionHeading title={t("uiThisMonth")} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {permissions.data?.["fuel.read"] && (
                <Card
                  style={{
                    flexBasis: "45%",
                    flexGrow: 1,
                    padding: 16,
                    gap: 12,
                    borderRadius: 24,
                  }}
                >
                  <Ionicons name="water" size={22} color={c.primary} />
                  <Text style={{ color: c.muted, fontSize: 14 }}>
                    {vehicle?.energy_type === "ELECTRIC"
                      ? t("charging")
                      : r("fuel")}
                  </Text>
                  {monthlyFuel.isPending ? (
                    <PageSkeleton shape="amount" />
                  ) : (
                    <Text
                      style={{
                        color: c.ink,
                        fontSize: 24,
                        fontWeight: "800",
                      }}
                    >
                      {monthlyFuel.error
                        ? "—"
                        : moneyIn(
                            monthlyFuel.total,
                            vehicle?.default_currency_code ?? "INR",
                          )}
                    </Text>
                  )}
                  <TextAction
                    label={r("history")}
                    onPress={() => navigate("fuel")}
                  />
                </Card>
              )}
              {permissions.data?.["expenses.read"] && (
                <Card
                  style={{
                    flexBasis: "45%",
                    flexGrow: 1,
                    padding: 16,
                    gap: 12,
                    borderRadius: 24,
                  }}
                >
                  <Ionicons name="receipt" size={22} color={c.primary} />
                  <Text style={{ color: c.muted, fontSize: 14 }}>
                    {r("expenses")}
                  </Text>
                  {expenses.isPending ? (
                    <PageSkeleton shape="amount" />
                  ) : (
                    <Text
                      style={{
                        color: c.ink,
                        fontSize: 24,
                        fontWeight: "800",
                      }}
                    >
                      {expenses.error
                        ? "—"
                        : moneyIn(
                            total(expenses.data),
                            vehicle?.default_currency_code ?? "INR",
                          )}
                    </Text>
                  )}
                  <TextAction
                    label={r("history")}
                    onPress={() => navigate("expenses")}
                  />
                </Card>
              )}
            </View>
            {permissions.data?.["fuel.read"] &&
              (fuel.error || monthlyFuel.error) && (
                <ErrorState
                  message={(fuel.error || monthlyFuel.error)!.message}
                  retry={() => {
                    void fuel.refetch();
                    void monthlyFuel.refetch();
                  }}
                />
              )}
            {permissions.data?.["expenses.read"] && expenses.error && (
              <ErrorState
                message={expenses.error.message}
                retry={() => void expenses.refetch()}
              />
            )}
          </>
        )}
      {permissions.data &&
        !permissions.data.owner &&
        permissions.data["fuel.read"] &&
        fuel.error && (
          <ErrorState
            message={fuel.error.message}
            retry={() => void fuel.refetch()}
          />
        )}
      {permissions.data &&
        !permissions.data.owner &&
        permissions.data["expenses.read"] &&
        expenses.error && (
          <ErrorState
            message={expenses.error.message}
            retry={() => void expenses.refetch()}
          />
        )}
      {releaseFeatures.advancedTools &&
        permissions.data?.["reminders.read"] && (
          <>
            <SectionHeading
              title={r("reminders")}
              action={t("uiViewAll")}
              onAction={() => navigate("reminders")}
            />
            {reminderStatus?.error && (
              <ErrorState
                message={reminderStatus.error}
                retry={reminderStatus.retry}
              />
            )}
            {reminders.isPending && !reminders.error && (
              <PageSkeleton shape="rows" />
            )}
            {!reminders.isPending && !reminders.error && !upcoming.length && (
              <AppText muted>{t("uiNoReminders")}</AppText>
            )}
            {!!upcoming.length && (
              <Card
                style={{ paddingHorizontal: 12, paddingVertical: 0, gap: 0 }}
              >
                {upcoming.slice(0, 3).map((row) => (
                  <MenuRow
                    key={row.id}
                    label={String(row.payload.title)}
                    subtitle={
                      row.payload.due_at
                        ? Date.parse(String(row.payload.due_at)) < now
                          ? r("overdue")
                          : formatDate(
                              new Date(String(row.payload.due_at)),
                              {},
                              vehicle?.timezone ?? "Asia/Kolkata",
                            )
                        : r("dueReading")
                    }
                    icon="notifications"
                    tone="coral"
                    onPress={() => navigate("reminders", row.id)}
                  />
                ))}
              </Card>
            )}
            {!!completedReminders.length && (
              <>
                <SectionHeading title={r("reminderHistory")} />
                <Card
                  style={{ paddingHorizontal: 12, paddingVertical: 0, gap: 0 }}
                >
                  {completedReminders.slice(0, 3).map((row) => (
                    <MenuRow
                      key={row.id}
                      label={String(row.payload.title)}
                      subtitle={`${r("COMPLETED")}: ${formatDate(new Date(row.updated_at), {}, vehicle?.timezone ?? "Asia/Kolkata")}`}
                      icon="checkmark-circle"
                      tone="cyan"
                      onPress={() => navigate("reminders", row.id)}
                    />
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      {activityPending && (
        <>
          <SectionHeading title={t("uiRecentActivity")} />
          <PageSkeleton shape="rows" />
        </>
      )}
      {!activityPending && !!activity.length && (
        <>
          <SectionHeading title={t("uiRecentActivity")} />
          <Card style={{ paddingHorizontal: 12, paddingVertical: 0, gap: 0 }}>
            {activity.slice(0, moreActivity ? 10 : 3).map((row) => (
              <MenuRow
                key={`${row.kind}.${row.id}`}
                label={String(
                  row.payload.title || r(row.kind as "fuel" | "expenses"),
                )}
                subtitle={`${recordMoney(row.payload)} · ${formatDate(new Date(String(row.payload.event_at)), { day: "numeric", month: "short" }, vehicle?.timezone ?? "Asia/Kolkata")}`}
                icon={row.kind === "fuel" ? "water" : "receipt"}
                tone={row.kind === "fuel" ? "blue" : "amber"}
                onPress={() => navigate(row.kind, row.id)}
              />
            ))}
          </Card>
          {activity.length > 3 && (
            <TextAction
              label={t(moreActivity ? "uiFewerActions" : "uiMoreActivity")}
              icon={moreActivity ? "chevron-up" : "chevron-down"}
              onPress={() => setMoreActivity((value) => !value)}
            />
          )}
        </>
      )}
    </>
  );
}
