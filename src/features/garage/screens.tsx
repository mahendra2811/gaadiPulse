import { isPilotHistoryVisible } from "@/src/features/members/history";
import { useCurrentTime } from "@/src/hooks/useCurrentTime";
import { SquareArtwork } from "@/src/components/ui/SquareArtwork";
import { Timestamp } from "@/src/components/ui/Timestamp";
import { SearchField } from "@/src/components/ui/SearchField";
import { r } from "@/src/features/records/copy";
import { Dashboard } from "@/src/features/dashboard/Dashboard";
import { useVehicleAccess } from "@/src/hooks/useVehicleAccess";
import { useCallback, useState } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  SectionHeading,
  MotionPress,
  InfoRows,
} from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useVehicles, useActiveVehicle } from "./hooks";
import { useLatestReadings } from "./useLatestReadings";
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
  const groups = [
    {
      title: t("activeVehicles"),
      items: vehicles.filter((vehicle) => !vehicle.archived_at),
    },
    {
      title: t("archivedVehicles"),
      items: vehicles.filter((vehicle) => !!vehicle.archived_at),
    },
  ];
  return (
    <Screen title={t("garage")} loading={query.isPending} compact>
      <AppText muted>{t("uiGarageHint")}</AppText>
      <AppButton label={t("add")} onPress={() => router.push("/garage/add")} />
      <SearchField value={search} onChange={setSearch} />
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : !query.isPending && query.data?.length === 0 ? (
        <EmptyState title={t("empty")} body={t("emptyBody")} />
      ) : (
        <>
          {!query.isPending && !vehicles.length && (
            <EmptyState
              kind="search"
              title={t("emptySearchTitle")}
              body={t("uiNoSearchResults")}
              action={
                <AppButton
                  secondary
                  label={t("uiClearSearch")}
                  onPress={() => setSearch("")}
                />
              }
            />
          )}
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <View key={group.title} style={{ gap: 10 }}>
                <SectionHeading title={group.title} />
                <View
                  onLayout={(event) =>
                    setGridWidth(event.nativeEvent.layout.width)
                  }
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
                  {group.items.map((v) => (
                    <View
                      key={v.id}
                      style={{ width: cardWidth, minWidth: 0, gap: 6 }}
                    >
                      <MotionPress
                        label={`${t("details")}: ${v.nickname || v.registration_number || v.model || subtypeLabel(v.subtype)}`}
                        onPress={() =>
                          router.push({
                            pathname: "/garage/[id]",
                            params: { id: v.id },
                          })
                        }
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
                            style={{
                              paddingLeft: 10,
                              paddingRight: 58,
                              paddingBottom: 10,
                              minHeight: 80,
                              gap: 5,
                            }}
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
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                              }}
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
                                {t(
                                  v.meter_mode === "KM"
                                    ? "meterModeShortKm"
                                    : v.meter_mode === "HOURS"
                                      ? "meterModeShortHours"
                                      : "meterModeShortBoth",
                                )}
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
                      {v.role === "OWNER" && !v.archived_at && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${t("edit")}: ${v.nickname || v.registration_number || v.model || subtypeLabel(v.subtype)}`}
                          onPress={() =>
                            router.push({
                              pathname: "/garage/edit",
                              params: { id: v.id },
                            })
                          }
                          style={{
                            position: "absolute",
                            right: 8,
                            bottom: 6,
                            width: 44,
                            height: 44,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 14,
                            backgroundColor: colors.background,
                          }}
                        >
                          <Ionicons
                            name="create-outline"
                            size={22}
                            color={colors.primary}
                          />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
  const qc = useQueryClient();
  const toast = useToast();
  const colors = useTheme();
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
      {query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : vehicle ? (
        <>
          {vehicle.role === "OWNER" && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {!vehicle.archived_at && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("addVehicleMember")}
                    onPress={() =>
                      router.push({
                        pathname: "/owner/members",
                        params: { vehicle: id, add: "1" },
                      })
                    }
                    style={{
                      width: 48,
                      height: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("edit")}
                    onPress={() =>
                      router.push({ pathname: "/garage/edit", params: { id } })
                    }
                    style={{
                      width: 48,
                      height: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </Pressable>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  vehicle.archived_at ? "recover" : "archive",
                )}
                disabled={busy}
                onPress={() =>
                  ConfirmDialog(
                    t(vehicle.archived_at ? "recover" : "archive"),
                    t(
                      vehicle.archived_at
                        ? "recoverVehicleBody"
                        : "archiveVehicleBody",
                    ),
                    () => void archive(),
                  )
                }
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  backgroundColor: colors.background,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Ionicons
                  name={
                    vehicle.archived_at ? "refresh-outline" : "archive-outline"
                  }
                  size={22}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          )}
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
          {vehicle.archived_at && (
            <AppText muted>{t("archivedVehicleReadOnly")}</AppText>
          )}
        </>
      ) : (
        !query.isPending && <AppText>{t("denied")}</AppText>
      )}
      {error && <ErrorState message={error} retry={() => void archive()} />}
    </Screen>
  );
}
export function Home() {
  const query = useActiveVehicle();
  const user = useAccountId();
  const v = query.vehicle;
  const vehicleId = v?.id;
  const access = useVehicleAccess(v?.id);
  const now = useCurrentTime();
  const readings = useLatestReadings(v?.id);
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      if (user && vehicleId)
        void queryClient.invalidateQueries({
          queryKey: [user, vehicleId, "latest-observations"],
        });
    }, [queryClient, user, vehicleId]),
  );
  const colors = useTheme();
  const latestReadings = (["KM", "HOURS"] as const)
    .filter((kind) => v?.meter_mode === "BOTH" || v?.meter_mode === kind)
    .map((kind) => readings.data?.find((row) => row.reading_type === kind))
    .filter((reading) => reading !== undefined)
    .filter(
      (reading) =>
        v?.role !== "PILOT" ||
        isPilotHistoryVisible(reading.observed_at, v.timezone, now),
    );
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
                ) : latestReadings.length ? (
                  <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
                    {latestReadings.map((reading, index) => (
                      <View
                        key={reading.id}
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          columnGap: 12,
                          rowGap: 4,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: colors.line,
                        }}
                      >
                        <Text
                          accessibilityLabel={`${t(reading.reading_type)}: ${reading.value.toLocaleString("en-IN", { maximumFractionDigits: 3 })}`}
                          style={{
                            color: colors.ink,
                            fontSize: 22,
                            fontWeight: "800",
                            flexShrink: 1,
                          }}
                        >
                          {reading.value.toLocaleString("en-IN", {
                            maximumFractionDigits: 3,
                          })}
                          <Text
                            style={{
                              color: colors.muted,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            {" "}
                            {t(
                              reading.reading_type === "KM"
                                ? "unitKmShort"
                                : "unitHoursShort",
                            )}
                          </Text>
                        </Text>
                        <Timestamp
                          value={reading.observed_at}
                          timezone={v.timezone}
                        />
                      </View>
                    ))}
                  </Card>
                ) : !readings.isPending ? (
                  <EmptyState
                    kind="meters"
                    title={t("emptyMetersTitle")}
                    body={t("emptyMeterReadOnlyBody")}
                  />
                ) : null}
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
