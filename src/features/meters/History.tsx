import { isPilotHistoryVisible } from "@/src/features/members/history";
import { useCurrentTime } from "@/src/hooks/useCurrentTime";
import { isReading } from "@/src/utils/formInput";
import { HistoryRow } from "@/src/components/ui/HistoryRow";
import { readableDateTime } from "@/src/utils/dateDisplay";
import { Timestamp } from "@/src/components/ui/Timestamp";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { t } from "@/src/lib/i18n";
import { SectionHeading, TextAction } from "@/src/components/ui/premium";
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
  EmptyState,
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
import { readDevelopment, writeDevelopment } from "@/src/features/development/repository";
import { r } from "@/src/features/records/copy";
type Reading = Awaited<ReturnType<typeof loadObservations>>[number];
export default function MeterHistory() {
  const active = useActiveVehicle();
  return <MeterHistoryContent key={active.vehicle?.id ?? "none"} />;
}
function MeterHistoryContent() {
  const active = useActiveVehicle();
  const vehicle = active.vehicle;
  const user = useAccountId();
  const { development } = useSession();
  const permissions = usePermissions(vehicle?.id);
  const now = useCurrentTime();
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Reading | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState(() => Crypto.randomUUID());
  const [type, setType] = useState("ALL");
  const [limit, setLimit] = useState(12);
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
      if ((!retract && !isReading(value)) || !reason.trim()) throw new Error(r("correctionReason"));
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
      setCorrecting(false);
      toast(r("saved"), "success");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const visibleReadings = (query.data ?? []).filter(
    (row) =>
      vehicle?.role !== "PILOT" || isPilotHistoryVisible(row.observed_at, vehicle.timezone, now)
  );
  const hasBothTypes =
    vehicle?.meter_mode === "BOTH" ||
    new Set(visibleReadings.map((row) => row.reading_type)).size > 1;
  const filteredReadings = visibleReadings.filter(
    (row) => type === "ALL" || row.reading_type === type
  );
  return (
    <Screen compact title={r("meters")} loading={query.isPending || busy}>
      <VehicleHeader />
      {active.error && (
        <ErrorState message={active.error.message} retry={() => void active.refetch()} />
      )}
      {permissions.error && (
        <ErrorState message={permissions.error.message} retry={() => void permissions.refetch()} />
      )}
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
      {permissions.data?.owner === false && <AppText muted>{t("pilotHistoryHint")}</AppText>}
      {hasBothTypes && (
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
      )}
      {query.error ? (
        <ErrorState message={query.error.message} retry={() => void query.refetch()} />
      ) : filteredReadings.length ? (
        <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
          {filteredReadings.slice(0, limit).map((row, index) => (
            <HistoryRow
              key={row.id}
              primary={`${row.value.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${row.reading_type === "KM" ? "km" : "hrs"}`}
              secondary={row.reading_type === "KM" ? r("distance") : r("hours")}
              status={
                row.status === "CORRECTED"
                  ? t("meterCorrected")
                  : row.is_reset
                    ? r("reset")
                    : undefined
              }
              date={readableDateTime(row.observed_at, vehicle?.timezone)}
              separated={index > 0}
              onPress={() => {
                setSelected(row);
                setCorrecting(false);
                setError("");
              }}
            />
          ))}
        </Card>
      ) : null}
      {!query.isPending && !query.error && !visibleReadings.length && (
        <EmptyState kind="meters" title={t("emptyMetersTitle")} body={t(permissions.data?.["meters.create"] ? "emptyMetersBody" : "emptyMeterReadOnlyBody")} />
      )}
      {!query.isPending &&
        !query.error &&
        visibleReadings.length > 0 &&
        filteredReadings.length === 0 && <EmptyState kind="meters" title={t("emptyMeterFilterTitle")} body={t("emptyMeterFilterBody")} />}
      {filteredReadings.length > limit && (
        <TextAction
          label={r("more")}
          icon="chevron-down"
          onPress={() => setLimit((value) => value + 12)}
        />
      )}
      <Sheet
        visible={!!selected}
        onClose={() => {
          setSelected(null);
          setCorrecting(false);
          setError("");
        }}
      >
        {selected && !correcting ? (
          <View style={{ gap: 12 }}>
            <AppText
              large
            >{`${selected.value.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${selected.reading_type === "KM" ? "km" : "hrs"}`}</AppText>
            <Timestamp value={selected.observed_at} timezone={vehicle?.timezone} />
            <AppText muted>
              {selected.source === "MANUAL"
                ? t("meterManual")
                : selected.source === "FUEL"
                  ? r("fuel")
                  : selected.source === "EXPENSE"
                    ? r("expenses")
                    : selected.source === "PROGRESS"
                      ? r("progress")
                      : selected.source === "BASELINE"
                        ? t("meterBaseline")
                        : (selected.source ?? r("development"))}
            </AppText>
            {selected.status === "CORRECTED" && (
              <AppText muted>
                {t("meterCorrected")} · {t("meterHistorical")}
              </AppText>
            )}
            {selected.is_reset && <AppText muted>{r("reset")}</AppText>}
            {selected.entered_at && (
              <Timestamp
                value={selected.entered_at}
                timezone={vehicle?.timezone}
                label={t("meterRecorded")}
              />
            )}
            {permissions.data?.owner && selected.status !== "CORRECTED" && (
              <TextAction
                label={r("correction")}
                icon="create-outline"
                onPress={() => {
                  setOperation(Crypto.randomUUID());
                  setValue(String(selected.value));
                  setReason("");
                  setCorrecting(true);
                }}
              />
            )}
          </View>
        ) : (
          <>
            <AppText>{r("correctionHelp")}</AppText>
            <InputField
              label={selected?.reading_type === "HOURS" ? r("hours") : r("distance")}
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
            <AppButton label={r("save")} disabled={busy} onPress={() => void correct()} />
            <AppButton
              secondary
              label={r("retract")}
              disabled={busy}
              onPress={() =>
                ConfirmDialog(r("retract"), r("correctionHelp"), () => void correct(true))
              }
            />
          </>
        )}
        {error && <ErrorState message={error} retry={() => setError("")} />}
      </Sheet>
    </Screen>
  );
}
