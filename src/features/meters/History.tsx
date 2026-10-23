import { observations as loadObservations } from "./api";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { z } from "zod";
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
const readingSchema = z.object({
  id: z.string(),
  reading_type: z.enum(["KM", "HOURS"]),
  value: z.coerce.number(),
  observed_at: z.string(),
  entered_at: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  is_reset: z.boolean().optional(),
});
type Reading = z.infer<typeof readingSchema>;
export default function MeterHistory() {
  const active = useActiveVehicle();
  const vehicle = active.vehicle;
  const user = useAccountId();
  const { development } = useSession();
  const permissions = usePermissions(vehicle?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Reading | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
      if (
        (!retract &&
          (!Number.isFinite(replacement) || Number(replacement) < 0)) ||
        !reason.trim()
      )
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
          p_operation: Crypto.randomUUID(),
        });
        if (error) throw new Error(error.message);
      }
      await qc.invalidateQueries();
      setSelected(null);
      toast(r("saved"));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const measured = measuredIntervals(query.data ?? []);
  return (
    <Screen title={r("meters")} loading={query.isPending || busy}>
      <VehicleHeader />
      {permissions.data?.["meters.create"] && (
        <AppButton
          label={r("addMeter")}
          onPress={() =>
            router.push({
              pathname: "/records/[kind]/[action]",
              params: { kind: "meters", action: "add" },
            })
          }
        />
      )}
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        query.data?.map((row) => (
          <Card key={row.id}>
            <AppText large>
              {row.value} {row.reading_type}
            </AppText>
            <AppText>
              {r("observed")}: {row.observed_at}
            </AppText>
            <AppText muted>
              {row.entered_at ?? ""} · {row.source ?? r("development")} ·{" "}
              {row.status ?? "ACTIVE"}
            </AppText>
            {row.is_reset && <AppText>{r("reset")}</AppText>}
            {permissions.data?.owner && row.status !== "CORRECTED" && (
              <AppButton
                secondary
                label={r("correction")}
                onPress={() => {
                  setSelected(row);
                  setValue(String(row.value));
                  setReason("");
                }}
              />
            )}
          </Card>
        ))
      )}
      <AppText large>{r("measured")}</AppText>
      {measured.map((interval, index) => (
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
      ))}
      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        <AppText>{r("correctionHelp")}</AppText>
        <InputField
          label={r("distance")}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
        />
        <InputField
          label={r("correctionReason")}
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
