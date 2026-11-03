import { useState } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useReminderReconciliation } from "@/src/features/reminders/useReminders";
import { useCurrentTime } from "@/src/hooks/useCurrentTime";
import { Card, AppText, ErrorState } from "@/src/components/ui";
import {
  Expandable,
  ActionTile,
  GradientSurface,
  MenuRow,
  MotionPress,
  SectionHeading,
  TextAction,
  type IconName,
  type IconTone,
} from "@/src/components/ui/premium";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useRecords, usePermissions } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { money } from "@/src/utils/money";
import { dateInZone } from "@/src/features/progress/schema";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
export function Dashboard() {
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
  reminderStatus: ReturnType<typeof useReminderReconciliation>;
}) {
  const { vehicle } = useActiveVehicle();
  const permissions = usePermissions(vehicle?.id);
  const fuel = useRecords("fuel");
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
  const total = (entries: typeof fuel.data) =>
    entries
      ?.filter(
        (row) =>
          !row.localStatus &&
          row.status !== "ARCHIVED" &&
          dateInZone(
            new Date(String(row.payload.event_at)),
            vehicle?.timezone ?? "Asia/Kolkata",
          ).startsWith(month),
      )
      .reduce((sum, row) => sum + Number(row.payload.amount_paise ?? 0), 0) ??
    0;
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
        label: t("uiAddFuel"),
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
      {
        label: t("uiAddProgress"),
        icon: "checkbox",
        tone: "violet",
        show: !!permissions.data?.["progress.submit"],
        run: () => navigate("progress", "add"),
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
        label: r("progress"),
        icon: "calendar",
        tone: "violet",
        show: !!permissions.data?.["progress.view"],
        run: () => navigate("progress"),
      },
      {
        label: r("reports"),
        icon: "stats-chart",
        tone: "blue",
        show: !!permissions.data?.["reports.read"],
        run: () => router.push("/reports"),
      },
      {
        label: r("approvals"),
        icon: "checkmark-done-circle",
        tone: "mint",
        show: !!permissions.data?.owner,
        run: () => router.push("/progress/approvals"),
      },
      {
        label: r("builder"),
        icon: "options",
        tone: "cyan",
        show: !!permissions.data?.owner,
        run: () => router.push("/owner/form-builder"),
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
  const activity = [
    ...(permissions.data?.["fuel.read"] ? (fuel.data ?? []) : []).map(
      (row) => ({ ...row, kind: "fuel" }),
    ),
    ...(permissions.data?.["expenses.read"] ? (expenses.data ?? []) : []).map(
      (row) => ({ ...row, kind: "expenses" }),
    ),
  ]
    .filter((row) => !row.localStatus && row.status !== "ARCHIVED")
    .sort(
      (a, b) =>
        Date.parse(String(b.payload.event_at)) -
        Date.parse(String(a.payload.event_at)),
    );
  const upcoming =
    reminders.data
      ?.filter((row) => row.status === "ACTIVE" && !row.localStatus)
      .sort(
        (a, b) =>
          (a.payload.due_at ? Date.parse(String(a.payload.due_at)) : Infinity) -
          (b.payload.due_at ? Date.parse(String(b.payload.due_at)) : Infinity),
      ) ?? [];
  return (
    <>
      {permissions.error && (
        <ErrorState
          message={permissions.error.message}
          retry={() => void permissions.refetch()}
        />
      )}
      {(permissions.data?.["fuel.read"] ||
        permissions.data?.["expenses.read"]) && (
        <>
          <SectionHeading title={t("uiThisMonth")} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {permissions.data?.["fuel.read"] && (
              <GradientSurface
                colors={["#294A87", "#3764A1", "#2B688D"]}
                style={{
                  flexBasis: "45%",
                  flexGrow: 1,
                  padding: 16,
                  gap: 12,
                  borderRadius: 24,
                }}
              >
                <Ionicons name="water" size={22} color="#D5EEFF" />
                <Text style={{ color: "#E0EDFF", fontSize: 14 }}>
                  {r("fuel")}
                </Text>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}
                >
                  {fuel.isPending || fuel.error ? "—" : money(total(fuel.data))}
                </Text>
                <TextAction
                  light
                  label={r("history")}
                  onPress={() => navigate("fuel")}
                />
              </GradientSurface>
            )}
            {permissions.data?.["expenses.read"] && (
              <GradientSurface
                colors={["#78501E", "#96612C", "#92532F"]}
                style={{
                  flexBasis: "45%",
                  flexGrow: 1,
                  padding: 16,
                  gap: 12,
                  borderRadius: 24,
                }}
              >
                <Ionicons name="receipt" size={22} color="#FFEBC2" />
                <Text style={{ color: "#FFF0D8", fontSize: 14 }}>
                  {r("expenses")}
                </Text>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}
                >
                  {expenses.isPending || expenses.error
                    ? "—"
                    : money(total(expenses.data))}
                </Text>
                <TextAction
                  light
                  label={r("history")}
                  onPress={() => navigate("expenses")}
                />
              </GradientSurface>
            )}
          </View>
          {permissions.data?.["fuel.read"] && fuel.error && (
            <ErrorState
              message={fuel.error.message}
              retry={() => void fuel.refetch()}
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
      {!!secondary.length && (
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
                minHeight: 48,
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
              {secondary.map((action) => (
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
      {!!activity.length && (
        <>
          <SectionHeading title={t("uiRecentActivity")} />
          <View>
            {activity.slice(0, moreActivity ? 10 : 3).map((row) => (
              <MenuRow
                key={`${row.kind}.${row.id}`}
                label={String(
                  row.payload.title || r(row.kind as "fuel" | "expenses"),
                )}
                subtitle={`${money(Number(row.payload.amount_paise ?? 0))} · ${new Date(String(row.payload.event_at)).toLocaleDateString(undefined, { timeZone: vehicle?.timezone ?? "Asia/Kolkata", day: "numeric", month: "short" })}`}
                icon={row.kind === "fuel" ? "water" : "receipt"}
                tone={row.kind === "fuel" ? "blue" : "amber"}
                onPress={() => navigate(row.kind, row.id)}
              />
            ))}
          </View>
          {activity.length > 3 && (
            <TextAction
              label={t(moreActivity ? "uiFewerActions" : "uiMoreActivity")}
              icon={moreActivity ? "chevron-up" : "chevron-down"}
              onPress={() => setMoreActivity((value) => !value)}
            />
          )}
        </>
      )}
      {permissions.data?.["reminders.read"] && (
        <>
          <SectionHeading
            title={r("reminders")}
            action={t("uiViewAll")}
            onAction={() => navigate("reminders")}
          />
          {reminderStatus.error && (
            <ErrorState
              message={reminderStatus.error}
              retry={reminderStatus.retry}
            />
          )}
          {!reminders.isPending && !reminders.error && !upcoming.length && (
            <AppText muted>{t("uiNoReminders")}</AppText>
          )}
          {upcoming.slice(0, 3).map((row) => (
            <MenuRow
              key={row.id}
              label={String(row.payload.title)}
              subtitle={
                row.payload.due_at
                  ? Date.parse(String(row.payload.due_at)) < now
                    ? r("overdue")
                    : new Date(String(row.payload.due_at)).toLocaleDateString(
                        undefined,
                        { timeZone: vehicle?.timezone ?? "Asia/Kolkata" },
                      )
                  : r("dueReading")
              }
              icon="notifications"
              tone="coral"
              onPress={() => navigate("reminders", row.id)}
            />
          ))}
        </>
      )}
    </>
  );
}
