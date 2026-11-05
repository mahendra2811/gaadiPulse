import { isPilotHistoryVisible } from "@/src/features/members/history";
import { useCurrentTime } from "@/src/hooks/useCurrentTime";
import { isReading } from "@/src/utils/formInput";
import { ReadingCard } from "./ReadingCard";
import { TimestampRange } from "@/src/components/ui/Timestamp";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { t } from "@/src/lib/i18n";
import { measuredIntervals } from "@/src/utils/meter";
import {
  SectionHeading,
  Expandable,
  TextAction,
} from "@/src/components/ui/premium";
import { observations as loadObservations } from "./api";
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import * as Crypto from "expo-crypto";
import {
  Screen,
  AppText,
  AppButton,
  InputField,
  Card,
  Sheet,
  ErrorState,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { client } from "@/src/lib/supabase";
import { usePermissions } from "@/src/features/records/hooks";
import {
  readDevelopment,
  writeDevelopment,
} from "@/src/features/development/repository";
import { r } from "@/src/features/records/copy";
type Reading = Awaited<ReturnType<typeof loadObservations>>[number];
export default function MeterHistory() {
  const active = useActiveVehicle();
  const vehicle = active.vehicle;
  const user = useAccountId();
  const { development } = useSession();
  const permissions = usePermissions(vehicle?.id);
  const now = useCurrentTime();
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Reading | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState(() => Crypto.randomUUID());
  const [type, setType] = useState("ALL");
  const [limit, setLimit] = useState(12);
  const [showMeasured, setShowMeasured] = useState(false);
  const query = useQuery({
    queryKey: [user, vehicle?.id, "meter-history"],
    enabled: !!vehicle,
    queryFn: () => loadObservations(user!, vehicle!.id, development, true),
  });
  const correct = async (retract = false) => {
    if (!selected || !vehicle || busy) return;
    setBusy(true);
    try {
      const replacement = retract ? null : Number(value);
      if ((!retract && !isReading(value)) || !reason.trim())
        throw new Error(r("correctionReason"));
      if (development) {
        const corrections =
          ((await readDevelopment(`meterCorrections.${vehicle.id}`)) as Record<
            string,
            { value: number | null; reason: string }
          >) ?? {};
        await writeDevelopment(`meterCorrections.${vehicle.id}`, {
          ...corrections,
          [selected.id]: { value: replacement, reason, original: selected },
        });
      } else {
        const { error } = await client().rpc("correct_meter_observation", {
          p_vehicle: vehicle.id,
          p_reading: selected.id,
          p_expected: selected.value,
          p_value: replacement,
          p_reason: reason,
          p_operation: operation,
        });
        if (error) throw new Error(error.message);
      }
      setOperation(Crypto.randomUUID());
      await qc.invalidateQueries();
      setSelected(null);
      toast(r("saved"), "success");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const visibleReadings = (query.data ?? []).filter(
    (row) =>
      vehicle?.role !== "PILOT" ||
      isPilotHistoryVisible(row.observed_at, vehicle.timezone, now),
  );
  const measured = measuredIntervals(
    visibleReadings.filter((row) => !row.status || row.status === "ACTIVE"),
  );
  return (
    <Screen compact title={r("meters")} loading={query.isPending || busy}>
      <VehicleHeader />
      <SectionHeading
        title={t("meterHistory")}
        action={permissions.data?.["meters.create"] ? r("addMeter") : undefined}
        onAction={() =>
          router.push({
            pathname: "/records/[kind]/[action]",
            params: { kind: "meters", action: "add", vehicle: vehicle?.id },
          })
        }
      />
      <AppText muted>
        {t("meterTimeZone")}: {vehicle?.timezone ?? "Asia/Kolkata"}
      </AppText>
      {permissions.data?.owner === false && (
        <AppText muted>{t("pilotHistoryHint")}</AppText>
      )}
      <FilterChips
        items={[
          { id: "ALL", label: r("ALL") },
          { id: "KM", label: "KM" },
          { id: "HOURS", label: r("hours") },
        ]}
        value={type}
        onChange={(value) => {
          setType(value);
          setLimit(12);
        }}
      />
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        visibleReadings
          .filter((row) => type === "ALL" || row.reading_type === type)
          .slice(0, limit)
          .map((row) => (
            <ReadingCard
              key={row.id}
              reading={row}
              timezone={vehicle?.timezone}
              onCorrect={
                permissions.data?.owner && row.status !== "CORRECTED"
                  ? () => {
                      setOperation(Crypto.randomUUID());
                      setSelected(row);
                      setValue(String(row.value));
                      setReason("");
                    }
                  : undefined
              }
            />
          ))
      )}
      {!query.isPending && !query.error && !visibleReadings.length && (
        <AppText muted>{r("noData")}</AppText>
      )}
      {visibleReadings.filter(
        (row) => type === "ALL" || row.reading_type === type,
      ).length > limit && (
        <TextAction
          label={r("more")}
          icon="chevron-down"
          onPress={() => setLimit((value) => value + 12)}
        />
      )}
      <SectionHeading
        title={t("meterMeasured")}
        action={showMeasured ? t("uiFewerActions") : t("uiViewAll")}
        onAction={() => setShowMeasured((value) => !value)}
      />
      <Expandable expanded={showMeasured}>
        <View style={{ gap: 10 }}>
          {measured
            .filter((interval) => type === "ALL" || interval.type === type)
            .map((interval, index) => (
              <Card key={index} style={{ padding: 14, gap: 10 }}>
                <AppText large>
                  {interval.anomaly
                    ? r("conflict")
                    : `${interval.delta.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${interval.type}`}
                </AppText>
                <TimestampRange
                  from={interval.from}
                  to={interval.to}
                  timezone={vehicle?.timezone}
                />
              </Card>
            ))}
        </View>
      </Expandable>
      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        <AppText>{r("correctionHelp")}</AppText>
        <InputField
          label={
            selected?.reading_type === "HOURS" ? r("hours") : r("distance")
          }
          required
          numeric={{ scale: 3 }}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
        />
        <InputField
          label={r("correctionReason")}
          required
          maxLength={3000}
          value={reason}
          onChangeText={setReason}
        />
        <AppButton
          label={r("save")}
          disabled={busy}
          onPress={() => void correct()}
        />
        <AppButton
          secondary
          label={r("retract")}
          disabled={busy}
          onPress={() =>
            ConfirmDialog(
              r("retract"),
              r("correctionHelp"),
              () => void correct(true),
            )
          }
        />
      </Sheet>
      {error && <ErrorState message={error} retry={() => setError("")} />}
    </Screen>
  );
}
