import { useState } from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import { z } from "zod";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  Screen,
  AppText,
  AppButton,
  InputField,
  Card,
  ErrorState,
  ConfirmDialog,
  Sheet,
  useToast,
} from "@/src/components/ui";
import {
  MenuRow,
  SectionHeading,
  TextAction,
} from "@/src/components/ui/premium";
import { Timestamp } from "@/src/components/ui/Timestamp";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { usePermissions } from "@/src/features/records/hooks";
import { r } from "@/src/features/records/copy";
import { t } from "@/src/lib/i18n";
import { requirePilotPolicy } from "./pilotPolicy";
import { resolveMemberVehicle } from "./vehicleContext";
import type { Vehicle } from "@/src/features/garage/schema";
import {
  members,
  grantAccess,
  changeMember,
  revokeGrant,
  saveDefaults,
  backdatePermissionKey,
  type Member,
} from "./api";
import { BackdateEditor, PermissionEditor, RolePicker } from "./MemberControls";
import { effectiveBackdateDays, pilotPermissionSummary } from "./permissions";

export default function Members() {
  const { vehicle: vehicleId, add } = useLocalSearchParams<{
    vehicle?: string;
    add?: string;
  }>();
  const active = useActiveVehicle();
  const vehicle = resolveMemberVehicle(vehicleId, active.data, active.vehicle);
  if (active.error)
    return (
      <Screen title={r("members")}>
        <ErrorState
          message={active.error.message}
          retry={() => void active.refetch()}
        />
      </Screen>
    );
  if (vehicle)
    return (
      <Redirect
        href={{
          pathname: "/garage/[id]",
          params: { id: vehicle.id, ...(add === "1" ? { add: "1" } : {}) },
        }}
      />
    );
  return (
    <Screen title={r("members")} loading={active.isPending}>
      {!active.isPending && (
        <>
          <AppText>
            {vehicleId ? t("memberVehicleUnavailable") : r("noVehicle")}
          </AppText>
          <AppButton
            secondary
            label={t("openGarage")}
            onPress={() => router.push("/garage")}
          />
        </>
      )}
    </Screen>
  );
}
export function VehicleMembersSection({
  vehicle: v,
  openGrant = false,
}: {
  vehicle: Vehicle;
  openGrant?: boolean;
}) {
  const user = useAccountId(),
    { development } = useSession(),
    access = usePermissions(v?.id),
    qc = useQueryClient(),
    toast = useToast();
  const query = useQuery({
    queryKey: [user, v?.id, "members"],
    enabled: !!v && access.data?.owner === true,
    staleTime: 15_000,
    gcTime: 60_000,
    queryFn: () => members(v!.id, development),
  });
  const pilotPolicy = useQuery({
    queryKey: [user, v?.id, "pilot-policy"],
    enabled: !!v && access.data?.owner === true,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!development) await requirePilotPolicy();
      return true;
    },
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "PILOT">("PILOT");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [defaults, setDefaults] = useState<Record<string, boolean> | null>(
    null,
  );
  const [defaultBackdateDays, setDefaultBackdateDays] = useState<
    import("./api").BackdateWindow | null
  >(null);
  const [grantBackdateDays, setGrantBackdateDays] = useState<
    import("./api").BackdateWindow | null
  >(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showGrant, setShowGrant] = useState(openGrant);
  const [showDefaults, setShowDefaults] = useState(false);
  const locked = !!v?.archived_at;
  const closeGrant = () => {
    if (!busy) {
      setShowGrant(false);
      setEmail("");
      setRole("PILOT");
      setOverrides({});
      setGrantBackdateDays(null);
      setError("");
    }
  };
  const closeMember = () => {
    if (!busy) {
      setSelected(null);
      setError("");
    }
  };
  const run = async (
    action: () => Promise<void>,
    message: string = r("saved"),
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await qc.invalidateQueries({
        predicate: (entry) =>
          entry.queryKey[0] === user &&
          (entry.queryKey[1] === v.id || entry.queryKey[1] === "vehicles"),
      });
      toast(message, "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  if (access.error)
    return (
      <>
        <SectionHeading title={t("memberAccessTitle")} />
        <ErrorState
          message={access.error.message}
          retry={() => void access.refetch()}
        />
      </>
    );
  const activeMembers =
    query.data?.members.filter((m) => m.status === "ACTIVE") ?? [];
  const revokedMembers =
    query.data?.members.filter((m) => m.status === "REVOKED") ?? [];
  const pending =
    query.data?.grants.filter((g) => g.status === "UNRESOLVED") ?? [];
  const memberRow = (member: Member) => {
    const name = member.display_name || t("memberPlaceholder");
    const status = t("memberRoleStatus")
      .replace("{role}", r(member.role))
      .replace(
        "{status}",
        t(
          member.status === "ACTIVE"
            ? "memberActiveStatus"
            : "memberRevokedStatus",
        ),
      )
      .replace(
        "{primary}",
        member.is_primary_admin ? t("memberPrimaryStatusSuffix") : "",
      );
    const details =
      member.status === "ACTIVE"
        ? member.role === "OWNER"
          ? t("memberFullOwner")
          : pilotPolicy.data
            ? `${pilotPermissionSummary(
                member.permission_overrides,
                query.data?.defaults ?? {},
              )} · ${effectiveBackdateDays(member.backdate_days, query.data?.defaults ?? {}) === -1 ? t("memberUnlimitedBackdating") : t("memberBackdateDaysSummary").replace("{days}", String(effectiveBackdateDays(member.backdate_days, query.data?.defaults ?? {})))}`
            : t("memberPolicyUnavailable")
        : "";
    const subtitle = details ? `${status}\n${details}` : status;
    return (
      <MenuRow
        key={member.user_id}
        label={name}
        accessibilityLabel={`${name}. ${status}. ${details}`}
        subtitle={subtitle}
        icon="person-circle"
        tone={member.role === "OWNER" ? "violet" : "blue"}
        onPress={() => {
          setError("");
          setSelected({
            ...member,
            permission_overrides: { ...member.permission_overrides },
          });
        }}
      />
    );
  };
  return (
    <>
      <SectionHeading title={t("memberAccessTitle")} />
      {access.isPending && <AppText muted>{t("memberLoadingAccess")}</AppText>}
      {access.data && !access.data.owner ? (
        <AppText>{r("permission")}</AppText>
      ) : access.data?.owner && v ? (
        <>
          <AppText muted>{t("memberManagementHelp")}</AppText>
          {locked && <AppText muted>{t("memberRestoreArchived")}</AppText>}
          {pilotPolicy.error && (
            <ErrorState
              message={pilotPolicy.error.message}
              retry={() => void pilotPolicy.refetch()}
            />
          )}
          {query.error && (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
            />
          )}
          {query.isPending && <AppText muted>{t("memberLoading")}</AppText>}
          <AppButton
            label={t("memberAddTitle")}
            disabled={locked || busy || !query.data || !pilotPolicy.data}
            onPress={() => {
              setError("");
              setShowGrant(true);
            }}
          />
          {query.data && (
            <>
              <Card style={{ padding: 16 }}>
                <SectionHeading
                  title={t("memberActiveCount").replace(
                    "{count}",
                    String(activeMembers.length),
                  )}
                />
                {activeMembers.length ? (
                  activeMembers.map(memberRow)
                ) : (
                  <AppText muted>{t("memberNoneActive")}</AppText>
                )}
              </Card>
              <Card style={{ padding: 16 }}>
                <SectionHeading
                  title={t("memberPendingCount").replace(
                    "{count}",
                    String(pending.length),
                  )}
                />
                <AppText muted>{t("memberPendingVerifiedHint")}</AppText>
                {pending.length ? (
                  pending.map((grant) => (
                    <View key={grant.id} style={{ gap: 8, paddingVertical: 8 }}>
                      <AppText>{grant.normalized_email}</AppText>
                      <AppText muted>
                        {r(grant.desired_role)} · Waiting for verified sign-in
                      </AppText>
                      <Timestamp
                        value={grant.created_at}
                        timezone={v.timezone}
                      />
                      <AppButton
                        secondary
                        label={t("memberCancelPending")}
                        disabled={busy || locked}
                        onPress={() =>
                          ConfirmDialog(
                            t("memberCancelGrantTitle"),
                            t("memberCancelGrantBodyWithEmail").replace(
                              "{email}",
                              grant.normalized_email,
                            ),
                            () =>
                              void run(
                                () => revokeGrant(v.id, grant.id, development),
                                t("memberPendingCancelledToast"),
                              ),
                            { confirmLabel: t("memberCancelAccessConfirm") },
                          )
                        }
                      />
                    </View>
                  ))
                ) : (
                  <AppText muted>{t("memberNonePending")}</AppText>
                )}
              </Card>
              {revokedMembers.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <SectionHeading
                    title={t("memberRevokedCount").replace(
                      "{count}",
                      String(revokedMembers.length),
                    )}
                  />
                  <AppText muted>{t("memberRevokedReviewHint")}</AppText>
                  {revokedMembers.map(memberRow)}
                </Card>
              )}
            </>
          )}
          {query.data && (
            <Card style={{ padding: 16 }}>
              <SectionHeading title={t("memberDefaults")} />
              <AppText muted>{t("memberDefaultsHint")}</AppText>
              <TextAction
                label={t(
                  showDefaults
                    ? "memberManageDefaultsHide"
                    : "memberManageDefaultsEdit",
                )}
                icon="options-outline"
                onPress={() => {
                  setDefaults(
                    Object.fromEntries(
                      Object.entries(query.data!.defaults).filter(
                        ([key]) => key !== backdatePermissionKey,
                      ),
                    ),
                  );
                  setDefaultBackdateDays(
                    effectiveBackdateDays(
                      undefined,
                      query.data!.defaults,
                    ) as import("./api").BackdateWindow,
                  );
                  setShowDefaults(!showDefaults);
                  setError("");
                }}
              />
              {showDefaults && (
                <>
                  <PermissionEditor
                    value={defaults ?? query.data.defaults}
                    onChange={setDefaults}
                    disabled={locked || busy}
                  />
                  <BackdateEditor
                    value={
                      defaultBackdateDays ??
                      effectiveBackdateDays(undefined, query.data.defaults)
                    }
                    onChange={(days) =>
                      setDefaultBackdateDays(
                        days as import("./api").BackdateWindow,
                      )
                    }
                    disabled={locked || busy}
                  />
                  <AppButton
                    label={t("memberSaveDefaults")}
                    disabled={
                      locked ||
                      busy ||
                      !pilotPolicy.data ||
                      (!defaults && defaultBackdateDays === null)
                    }
                    onPress={() =>
                      void run(async () => {
                        await saveDefaults(
                          v.id,
                          defaults ??
                            Object.fromEntries(
                              Object.entries(query.data!.defaults).filter(
                                ([key]) => key !== backdatePermissionKey,
                              ),
                            ),
                          (defaultBackdateDays ??
                            effectiveBackdateDays(
                              undefined,
                              query.data!.defaults,
                            )) as import("./api").BackdateWindow,
                          development,
                        );
                        setDefaults(null);
                        setDefaultBackdateDays(null);
                        setShowDefaults(false);
                      })
                    }
                  />
                </>
              )}
            </Card>
          )}
        </>
      ) : null}
      {!!error && !showGrant && !selected && (
        <ErrorState message={error} retry={() => setError("")} />
      )}
      <Sheet
        visible={!!v && !!access.data?.owner && showGrant}
        onClose={closeGrant}
      >
        <AppText large>{t("memberAddTitle")}</AppText>
        <AppText muted>
          {t("memberGrantVehicleHint").replace(
            "{vehicle}",
            v?.nickname || v?.registration_number || t("memberVehicleFallback"),
          )}
        </AppText>
        {development && <AppText muted>{r("development")}</AppText>}
        <InputField
          label={r("email")}
          required
          maxLength={254}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppText>{t("memberChooseRole")}</AppText>
        <RolePicker value={role} onChange={setRole} disabled={busy || locked} />
        {role === "PILOT" && (
          <>
            <AppText large>{t("memberPilotPermissions")}</AppText>
            <PermissionEditor
              value={overrides}
              defaults={query.data?.defaults}
              inherited
              onChange={setOverrides}
              disabled={busy || locked}
            />
            <BackdateEditor
              value={grantBackdateDays}
              onChange={setGrantBackdateDays}
              inherited
              disabled={busy || locked}
            />
          </>
        )}
        {!!error && <ErrorState message={error} retry={() => setError("")} />}
        <AppButton
          label={t("memberGrant")}
          disabled={
            busy ||
            locked ||
            !query.data ||
            !pilotPolicy.data ||
            !z.email().safeParse(email.trim()).success
          }
          onPress={() =>
            void run(async () => {
              await grantAccess(
                v!.id,
                email,
                role,
                role === "PILOT" ? overrides : {},
                role === "PILOT"
                  ? (grantBackdateDays as import("./api").BackdateWindow | null)
                  : null,
                development,
              );
              setEmail("");
              setRole("PILOT");
              setOverrides({});
              setGrantBackdateDays(null);
              setShowGrant(false);
            }, r("grantSaved"))
          }
        />
        <AppButton
          secondary
          label={t("memberCancel")}
          disabled={busy}
          onPress={closeGrant}
        />
      </Sheet>
      <Sheet visible={!!selected} onClose={closeMember}>
        {selected && (
          <>
            <AppText large>
              {selected.display_name || t("memberPlaceholder")}
            </AppText>
            <AppText muted>
              {t(
                selected.status === "ACTIVE"
                  ? "memberActiveAccess"
                  : "memberRevokedStatus",
              )}{" "}
              ·{" "}
              {v?.nickname ||
                v?.registration_number ||
                t("memberVehicleFallback")}
            </AppText>
            {selected.is_primary_admin && (
              <AppText muted>{t("memberPrimaryAdminHelp")}</AppText>
            )}
            {locked && <AppText muted>{t("memberRestoreVehicleHelp")}</AppText>}
            <AppText>{t("memberRole")}</AppText>
            <RolePicker
              value={selected.role}
              disabled={busy || locked || selected.is_primary_admin}
              onChange={(role) => setSelected({ ...selected, role })}
            />
            {selected.role === "PILOT" && (
              <>
                <AppText large>{t("memberPilotPermissions")}</AppText>
                <PermissionEditor
                  value={selected.permission_overrides}
                  defaults={query.data?.defaults}
                  inherited
                  onChange={(permission_overrides) =>
                    setSelected({ ...selected, permission_overrides })
                  }
                  disabled={busy || locked || selected.is_primary_admin}
                />
                <BackdateEditor
                  value={selected.backdate_days}
                  onChange={(backdate_days) =>
                    setSelected({
                      ...selected,
                      backdate_days: backdate_days as
                        import("./api").BackdateWindow | null,
                    })
                  }
                  inherited
                  disabled={busy || locked || selected.is_primary_admin}
                />
              </>
            )}
            {!!error && (
              <ErrorState message={error} retry={() => setError("")} />
            )}
            {selected.status === "ACTIVE" ? (
              <>
                <AppButton
                  label={t("memberSaveChanges")}
                  disabled={
                    busy ||
                    locked ||
                    selected.is_primary_admin ||
                    !pilotPolicy.data
                  }
                  onPress={() => {
                    const save = () =>
                      void run(async () => {
                        await changeMember(
                          v!.id,
                          selected.user_id,
                          selected.role,
                          selected.permission_overrides,
                          "ACTIVE",
                          selected.backdate_days,
                          development,
                        );
                        setSelected(null);
                      });
                    const original = query.data?.members.find(
                      (member) => member.user_id === selected.user_id,
                    );
                    if (selected.role === "OWNER" && original?.role !== "OWNER")
                      ConfirmDialog(
                        t("memberDialogRoleOwner"),
                        t("memberDialogRoleOwnerBody"),
                        save,
                        { confirmLabel: t("memberDialogRoleOwnerConfirm") },
                      );
                    else save();
                  }}
                />
                <AppButton
                  secondary
                  label={t("memberRevoke")}
                  disabled={busy || locked || selected.is_primary_admin}
                  onPress={() =>
                    ConfirmDialog(
                      t("memberDialogRevokeTitle"),
                      t("memberDialogRevokeBody"),
                      () =>
                        void run(async () => {
                          await changeMember(
                            v!.id,
                            selected.user_id,
                            selected.role,
                            selected.permission_overrides,
                            "REVOKED",
                            selected.backdate_days,
                            development,
                          );
                          setSelected(null);
                        }, t("memberAccessRevokedToast")),
                      { confirmLabel: t("memberDialogRevokeConfirm") },
                    )
                  }
                />
              </>
            ) : (
              <AppButton
                label={t("memberRestore")}
                disabled={busy || locked || !pilotPolicy.data}
                onPress={() =>
                  ConfirmDialog(
                    t("memberDialogRestoreTitle"),
                    t("memberDialogRestoreBody"),
                    () =>
                      void run(async () => {
                        await changeMember(
                          v!.id,
                          selected.user_id,
                          selected.role,
                          selected.permission_overrides,
                          "ACTIVE",
                          selected.backdate_days,
                          development,
                        );
                        setSelected(null);
                      }, t("memberAccessRestoredToast")),
                    { confirmLabel: t("memberDialogRestoreConfirm") },
                  )
                }
              />
            )}
            <AppButton
              secondary
              label={t("memberCancel")}
              disabled={busy}
              onPress={closeMember}
            />
          </>
        )}
      </Sheet>
    </>
  );
}
