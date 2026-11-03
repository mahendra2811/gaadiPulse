import { releaseFeatures, supportsRecord } from "@/src/features/release/scope";
import { SquareArtwork } from "@/src/components/ui/SquareArtwork";
import { Timestamp } from "@/src/components/ui/Timestamp";
import { recordVisuals } from "@/src/features/records/RecordCard";
import { SearchField } from "@/src/components/ui/SearchField";
import { usePermissions } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { Dashboard } from "@/src/features/dashboard/Dashboard";
import { developmentReadings } from "@/src/features/development/repository";
import { meterObservationSchema } from "@/src/lib/observations";
import { useVehicleAccess } from "@/src/hooks/useVehicleAccess";
import { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import {
  ColorIcon,
  SectionHeading,
  MotionPress,
  TextAction,
  ActionTile,
  InfoRows,
} from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import { useVehicles, useActiveVehicle } from "./hooks";
import { archiveVehicle } from "./api";
import {
  Screen,
  AppText,
  Card,
  AppButton,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { subtypeLabel } from "./subtypes";
import { vehicleArt } from "@/src/lib/assets";
import { t } from "@/src/lib/i18n";
import { client } from "@/src/lib/supabase";
import { useSession, useAccountId } from "@/src/features/auth/session";
export function Garage() {
  const query = useVehicles();
  const [search, setSearch] = useState("");
  const [gridWidth, setGridWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const columns =
    gridWidth < 260 || fontScale >= 1.8
      ? 1
      : gridWidth >= 540 && fontScale < 1.5
        ? 3
        : 2;
  const cardWidth =
    gridWidth > 0 ? (gridWidth - (columns - 1) * 10) / columns : undefined;
  const colors = useTheme();
  const vehicles =
    query.data?.filter((v) =>
      `${v.nickname} ${v.registration_number ?? ""} ${v.model} ${subtypeLabel(v.subtype)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  return (
    <Screen title={t("garage")} loading={query.isPending} compact>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText muted>{t("uiGarageHint")}</AppText>
        </View>
        <TextAction
          label={t("add")}
          icon="add-circle"
          onPress={() => router.push("/garage/add")}
        />
      </View>
      <SearchField value={search} onChange={setSearch} />
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : !query.isPending && query.data?.length === 0 ? (
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
      ) : (
        <>
          {!query.isPending && !vehicles.length && (
            <AppText muted>{t("uiNoSearchResults")}</AppText>
          )}
          <View
            onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
            style={{
              width: "100%",
              maxWidth: 640,
              alignSelf: "center",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            {vehicles.map((v) => (
              <MotionPress
                key={v.id}
                label={`${t("details")}: ${v.nickname || v.registration_number || v.model || subtypeLabel(v.subtype)}`}
                onPress={() =>
                  router.push({
                    pathname: "/garage/[id]",
                    params: { id: v.id },
                  })
                }
                style={{ width: cardWidth, minWidth: 0 }}
              >
                <View
                  style={{
                    overflow: "hidden",
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    gap: 8,
                    borderWidth: 1,
                    borderColor: colors.line,
                    shadowColor: "#163B46",
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 3 },
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <SquareArtwork
                    source={vehicleArt(v.category, v.subtype)}
                    radius={0}
                  />
                  <View
                    style={{ paddingHorizontal: 10, gap: 5, paddingBottom: 10 }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: colors.ink,
                      }}
                    >
                      {v.nickname ||
                        v.registration_number ||
                        v.model ||
                        subtypeLabel(v.subtype)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {subtypeLabel(v.subtype)}
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: colors.primary,
                          backgroundColor: colors.background,
                          paddingHorizontal: 7,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        {t(v.role === "OWNER" ? "owner" : "pilot")} ·{" "}
                        {t(v.meter_mode)}
                      </Text>
                      {v.archived_at && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.muted,
                            paddingVertical: 4,
                          }}
                        >
                          {t("archived")}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </MotionPress>
            ))}
          </View>
        </>
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
    <Screen compact title={t("details")} loading={query.isPending || busy}>
      {vehicle ? (
        <>
          <VehicleHeader vehicleId={id} allowSwitch={false} />
          <Card style={{ padding: 16 }}>
            <InfoRows
              items={[
                {
                  label: t("registration"),
                  value: vehicle.registration_number || "—",
                },
                {
                  label: t("modelStep"),
                  value: `${vehicle.brand} ${vehicle.model}`.trim() || "—",
                },
                { label: t("timezone"), value: vehicle.timezone },
              ]}
            />
          </Card>
          <AppText muted>{t("roleInfo")}</AppText>
          <AppText muted>{t("noPhoto")}</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {(
              [
                "fuel",
                "expenses",
                "progress",
                "documents",
                "reminders",
              ] as const
            )
              .filter(
                (kind) =>
                  supportsRecord(kind) &&
                  access.data?.[
                    kind === "progress" ? "progress.view" : `${kind}.read`
                  ],
              )
              .map((kind) => (
                <ActionTile
                  key={kind}
                  icon={recordVisuals[kind].icon}
                  tone={recordVisuals[kind].tone}
                  label={r(kind)}
                  onPress={() =>
                    router.push({
                      pathname: "/records/[kind]",
                      params: { kind, vehicle: id },
                    })
                  }
                />
              ))}
          </View>
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
          {releaseFeatures.advancedTools &&
            access.data?.["expenses.create"] && (
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
  const colors = useTheme();
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
      <AppText muted>{t("uiOverview")}</AppText>
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : v ? (
        <>
          <SectionHeading
            title={t("home")}
            action={t("garage")}
            onAction={() => router.push("/garage")}
          />
          <VehicleHeader hero />
          {access.error ? (
            <ErrorState
              message={access.error.message}
              retry={() => void access.refetch()}
            />
          ) : (
            access.data?.metersRead && (
              <>
                <SectionHeading
                  title={t("uiLatestReadings")}
                  action={r("history")}
                  onAction={() => router.push("/meters/history")}
                />
                {readings.error ? (
                  <ErrorState
                    message={readings.error.message}
                    retry={() => void readings.refetch()}
                  />
                ) : readings.data?.length ? (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
                  >
                    {(["KM", "HOURS"] as const)
                      .filter(
                        (kind) =>
                          v.meter_mode === "BOTH" || v.meter_mode === kind,
                      )
                      .map((kind) => {
                        const reading = readings.data.find(
                          (row) => row.reading_type === kind,
                        );
                        return (
                          <Card
                            key={kind}
                            style={{
                              flexBasis: "45%",
                              flexGrow: 1,
                              padding: 16,
                              borderWidth: 0,
                              shadowColor: "#192D48",
                              shadowOpacity: 0.06,
                              shadowOffset: { width: 0, height: 4 },
                              shadowRadius: 12,
                              elevation: 2,
                            }}
                          >
                            <ColorIcon
                              name={kind === "KM" ? "speedometer" : "time"}
                              tone={kind === "KM" ? "cyan" : "violet"}
                            />
                            <Text
                              style={{
                                color: colors.ink,
                                fontSize: 24,
                                fontWeight: "800",
                              }}
                            >
                              {reading ? reading.value.toLocaleString() : "—"}
                            </Text>
                            <AppText muted>{t(kind)}</AppText>
                            {reading ? (
                              <Timestamp
                                value={reading.observed_at}
                                timezone={v.timezone}
                              />
                            ) : (
                              <AppText muted>{t("noReadings")}</AppText>
                            )}
                          </Card>
                        );
                      })}
                  </View>
                ) : (
                  <AppText muted>{t("noReadings")}</AppText>
                )}
              </>
            )
          )}
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
