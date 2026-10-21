import { usePermissions } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { Dashboard } from "@/src/features/dashboard/Dashboard";
import { developmentReadings } from "@/src/features/development/repository";
import { meterObservationSchema } from "@/src/lib/observations";
import { useVehicleAccess } from "@/src/hooks/useVehicleAccess";
import { useState } from "react";
import { Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVehicles, useActiveVehicle } from "./hooks";
import { archiveVehicle } from "./api";
import {
  Screen,
  AppText,
  Card,
  AppButton,
  EmptyState,
  ErrorState,
  InputField,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { artwork, vehicleArt } from "@/src/lib/assets";
import { t } from "@/src/lib/i18n";
import { client } from "@/src/lib/supabase";
import { useSession, useAccountId } from "@/src/features/auth/session";
export function Garage() {
  const query = useVehicles();
  const [search, setSearch] = useState("");
  return (
    <Screen title={t("garage")} loading={query.isPending}>
      <AppButton label={t("add")} onPress={() => router.push("/garage/add")} />
      <InputField label={t("search")} value={search} onChangeText={setSearch} />
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : query.data?.length === 0 ? (
        <EmptyState title={t("empty")} body={t("emptyBody")} />
      ) : (
        query.data
          ?.filter((v) =>
            `${v.nickname} ${v.registration_number} ${v.model}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((v) => (
            <Card key={v.id}>
              <Image
                source={artwork[v.category]}
                style={{ width: "100%", height: 110, resizeMode: "contain" }}
              />
              <AppText large>
                {v.nickname || v.registration_number || v.model}
              </AppText>
              <AppText>
                {t(v.role === "OWNER" ? "owner" : "pilot")}
                {v.archived_at ? ` · ${t("archived")}` : ""}
              </AppText>
              <AppButton
                secondary
                label={t("details")}
                onPress={() =>
                  router.push({
                    pathname: "/garage/[id]",
                    params: { id: v.id },
                  })
                }
              />
            </Card>
          ))
      )}
    </Screen>
  );
}
export function VehicleDetails() {
  const { development } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useVehicles();
  const vehicle = query.data?.find((v) => v.id === id);
  const access = usePermissions(id);
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const archive = async () => {
    setBusy(true);
    try {
      await archiveVehicle(id, !vehicle?.archived_at, development);
      await qc.invalidateQueries();
      toast(t("saved"), "success");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t("details")} loading={query.isPending || busy}>
      {vehicle ? (
        <>
          <Image
            source={vehicleArt(vehicle.category, vehicle.subtype)}
            style={{ width: "100%", height: 180, resizeMode: "contain" }}
          />
          <AppText large>{vehicle.nickname || vehicle.model}</AppText>
          <AppText>{vehicle.registration_number}</AppText>
          <AppText>
            {vehicle.brand} {vehicle.model}
          </AppText>
          <AppText>
            {t(vehicle.meter_mode)} · {vehicle.timezone}
          </AppText>
          <AppText>{t(vehicle.role === "OWNER" ? "owner" : "pilot")}</AppText>
          <AppText muted>{t("roleInfo")}</AppText>
          <AppText muted>{t("noPhoto")}</AppText>
          {(["fuel", "expenses", "progress", "documents", "reminders"] as const)
            .filter(
              (kind) =>
                access.data?.[
                  kind === "progress" ? "progress.view" : `${kind}.read`
                ],
            )
            .map((kind) => (
              <AppButton
                key={kind}
                secondary
                label={r(kind)}
                onPress={() =>
                  router.push({
                    pathname: "/records/[kind]",
                    params: { kind, vehicle: id },
                  })
                }
              />
            ))}
          {access.data?.["meters.read"] && (
            <AppButton
              secondary
              label={r("meters")}
              onPress={() =>
                router.push({
                  pathname: "/records/[kind]",
                  params: { kind: "meters", vehicle: id },
                })
              }
            />
          )}
          {access.data?.["meters.create"] && (
            <AppButton
              label={r("addMeter")}
              onPress={() =>
                router.push({
                  pathname: "/records/[kind]/[action]",
                  params: { kind: "meters", action: "add", vehicle: id },
                })
              }
            />
          )}
          {access.data?.["expenses.create"] && (
            <AppButton
              label={r("addMaintenance")}
              onPress={() =>
                router.push({
                  pathname: "/records/[kind]/[action]",
                  params: {
                    kind: "expenses",
                    action: "add",
                    vehicle: id,
                    category: "SERVICE",
                  },
                })
              }
            />
          )}
          {vehicle.role === "OWNER" && (
            <>
              <AppButton
                label={t("edit")}
                onPress={() =>
                  router.push({ pathname: "/garage/edit", params: { id } })
                }
              />
              <AppButton
                secondary
                disabled={busy}
                label={t(vehicle.archived_at ? "recover" : "archive")}
                onPress={() =>
                  ConfirmDialog(
                    t(vehicle.archived_at ? "recover" : "archive"),
                    t("archiveBody"),
                    () => void archive(),
                  )
                }
              />
            </>
          )}
        </>
      ) : (
        !query.isPending && <AppText>{t("denied")}</AppText>
      )}
      {error && <ErrorState message={error} retry={() => void archive()} />}
      <AppButton secondary label={t("back")} onPress={() => router.back()} />
    </Screen>
  );
}
export function Home() {
  const query = useActiveVehicle();
  const { development } = useSession();
  const user = useAccountId();
  const v = query.vehicle;
  const access = useVehicleAccess(v?.id);
  const readings = useQuery({
    queryKey: [user, v?.id, "latest-observations"],
    enabled: !!v && access.data?.metersRead === true,
    queryFn: async () => {
      if (development) return developmentReadings(v!.id);
      const { data, error } = await client().rpc("latest_meter_readings", {
        p_vehicle: v!.id,
      });
      if (error) throw error;
      return meterObservationSchema.array().parse(data);
    },
  });
  return (
    <Screen
      title={t("app")}
      loading={
        query.isPending ||
        (!!v &&
          (access.isPending ||
            (access.data?.metersRead === true && readings.isPending)))
      }
    >
      <AppText muted>{t("tagline")}</AppText>
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : v ? (
        <>
          <VehicleHeader />
          <Card>
            <AppText>{t("meters")}</AppText>
            {access.error ? (
              <ErrorState
                message={access.error.message}
                retry={() => void access.refetch()}
              />
            ) : access.data && !access.data.metersRead ? (
              <AppText>{t("noAccess")}</AppText>
            ) : readings.error ? (
              <ErrorState
                message={readings.error.message}
                retry={() => void readings.refetch()}
              />
            ) : readings.data?.length ? (
              (["KM", "HOURS"] as const).map((kind) => {
                const r = readings.data.find(
                  (row: { reading_type: string }) => row.reading_type === kind,
                );
                return r ? (
                  <AppText
                    key={kind}
                  >{`${r.value} ${t(kind)} · ${new Date(r.observed_at).toLocaleString()}`}</AppText>
                ) : null;
              })
            ) : (
              <AppText muted>{t("noReadings")}</AppText>
            )}
          </Card>
          <AppButton
            label={t("garage")}
            onPress={() => router.push("/garage")}
          />
          <Dashboard />
        </>
      ) : (
        !query.isPending && (
          <EmptyState
            title={t("empty")}
            body={t("emptyBody")}
            action={
              <AppButton
                label={t("add")}
                onPress={() => router.push("/garage/add")}
              />
            }
          />
        )
      )}
    </Screen>
  );
}
export function Upcoming({ kind }: { kind: "fuel" | "expenses" }) {
  return (
    <Screen title={t(kind)}>
      <VehicleHeader />
      <EmptyState kind={kind} title={t("upcoming")} body={t("stage2")} />
    </Screen>
  );
}
