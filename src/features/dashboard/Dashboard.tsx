import { useReminderReconciliation } from "@/src/features/reminders/useReminders";
import { useState } from "react";
import { router } from "expo-router";
import { Card, AppText, AppButton, ErrorState } from "@/src/components/ui";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useRecords, usePermissions } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { money } from "@/src/utils/money";
import { dateInZone } from "@/src/features/progress/schema";
export function Dashboard() {
  const reminderError = useReminderReconciliation();
  const active = useActiveVehicle();
  const vehicle = active.vehicle;
  const permissions = usePermissions(vehicle?.id);
  const fuel = useRecords("fuel");
  const expenses = useRecords("expenses");
  const reminders = useRecords("reminders");
  const [error, setError] = useState("");
  const month = dateInZone(
    new Date(),
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
        ? { pathname: "/records/[kind]/[action]", params: { kind, action } }
        : { pathname: "/records/[kind]", params: { kind } },
    );
  return (
    <>
      {reminderError && <AppText>{reminderError}</AppText>}
      {permissions.data?.["fuel.read"] && (
        <Card>
          <AppText>
            {r("fuel")} · {month}
          </AppText>
          {fuel.error ? (
            <ErrorState
              message={fuel.error.message}
              retry={() => void fuel.refetch()}
            />
          ) : (
            <AppText large>
              {fuel.isPending ? "—" : money(total(fuel.data))}
            </AppText>
          )}
        </Card>
      )}
      {permissions.data?.["expenses.read"] && (
        <Card>
          <AppText>
            {r("expenses")} · {month}
          </AppText>
          {expenses.error ? (
            <ErrorState
              message={expenses.error.message}
              retry={() => void expenses.refetch()}
            />
          ) : (
            <AppText large>
              {expenses.isPending ? "—" : money(total(expenses.data))}
            </AppText>
          )}
        </Card>
      )}
      {permissions.data?.["meters.create"] && (
        <AppButton
          secondary
          label={`${r("add")} · ${r("meters")}`}
          onPress={() => navigate("meters", "add")}
        />
      )}
      {permissions.data?.["progress.submit"] && (
        <AppButton
          label={`${r("add")} · ${r("progress")}`}
          onPress={() => navigate("progress", "add")}
        />
      )}
      {permissions.data?.["progress.view"] && (
        <AppButton
          secondary
          label={`${r("progress")} · ${r("history")}`}
          onPress={() => navigate("progress")}
        />
      )}
      {permissions.data?.owner && (
        <>
          <AppButton
            secondary
            label={r("approvals")}
            onPress={() => router.push("/progress/approvals")}
          />
          <AppButton
            secondary
            label={r("builder")}
            onPress={() => router.push("/owner/form-builder")}
          />
          <AppButton
            secondary
            label={r("members")}
            onPress={() => router.push("/owner/members")}
          />
        </>
      )}
      {permissions.data?.["reminders.read"] && (
        <Card>
          <AppText large>{r("reminders")}</AppText>
          {reminders.data
            ?.filter((row) => row.status === "ACTIVE" && !row.localStatus)
            .slice(0, 4)
            .map((row) => (
              <AppButton
                key={row.id}
                secondary
                label={`${String(row.payload.title)} · ${row.payload.due_at && Date.parse(String(row.payload.due_at)) < Date.now() ? r("overdue") : String(row.payload.due_at || r("dueReading"))}`}
                onPress={() =>
                  router.push({
                    pathname: "/records/[kind]/[action]",
                    params: {
                      kind: "reminders",
                      action: row.id,
                      vehicle: row.vehicle_id,
                    },
                  })
                }
              />
            ))}
          <AppButton
            secondary
            label={r("history")}
            onPress={() => navigate("reminders")}
          />
        </Card>
      )}
      {error && <ErrorState message={error} retry={() => setError("")} />}
    </>
  );
}
