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
import { releaseFeatures } from "@/src/features/release/scope";
import { requirePilotPolicy } from "./pilotPolicy";
import { resolveMemberVehicle } from "./vehicleContext";
import type { Vehicle } from "@/src/features/garage/schema";
import {
  members,
  grantAccess,
  changeMember,
  revokeGrant,
  saveDefaults,
  type Member,
} from "./api";
import { PermissionEditor, RolePicker } from "./MemberControls";
import { pilotPermissionSummary } from "./permissions";

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
            {vehicleId
              ? "This vehicle is unavailable or your access has changed."
              : r("noVehicle")}
          </AppText>
          <AppButton
            secondary
            label="Open Garage"
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
    queryFn: () => members(v!.id, development),
  });
  const pilotPolicy = useQuery({
    queryKey: [user, v?.id, "pilot-policy"],
    enabled: !!v && access.data?.owner === true,
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
      await qc.invalidateQueries();
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
        <SectionHeading title="Vehicle member access" />
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
    const name = member.display_name || "Vehicle member";
    const status = `${r(member.role)} · ${member.status === "ACTIVE" ? "Active" : "Access revoked"}${member.is_primary_admin ? " · Primary administrator" : ""}`;
    const details =
      member.status === "ACTIVE"
        ? member.role === "OWNER"
          ? "Full Owner access"
          : pilotPolicy.data
            ? pilotPermissionSummary(
                member.permission_overrides,
                query.data?.defaults ?? {},
              )
            : "Pilot permissions unavailable until the access policy is verified"
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
      <SectionHeading title="Vehicle member access" />
      {access.isPending && <AppText muted>Loading vehicle access…</AppText>}
      {access.data && !access.data.owner ? (
        <AppText>{r("permission")}</AppText>
      ) : access.data?.owner && v ? (
        <>
          <AppText muted>
            Manage access for this vehicle. Roles and permissions are different
            for each vehicle.
          </AppText>
          {locked && (
            <AppText muted>
              This vehicle is archived. Restore it before changing access.
            </AppText>
          )}
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
          {query.isPending && <AppText muted>Loading members…</AppText>}
          <AppButton
            label="Add vehicle member"
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
                  title={`Active members (${activeMembers.length})`}
                />
                {activeMembers.length ? (
                  activeMembers.map(memberRow)
                ) : (
                  <AppText muted>No active members to display.</AppText>
                )}
              </Card>
              <Card style={{ padding: 16 }}>
                <SectionHeading title={`Pending access (${pending.length})`} />
                <AppText muted>
                  Access starts automatically when this email signs in with a
                  verified account. No invitation acceptance is needed.
                </AppText>
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
                        label="Cancel pending access"
                        disabled={busy || locked}
                        onPress={() =>
                          ConfirmDialog(
                            "Cancel pending access?",
                            `The grant for ${grant.normalized_email} will no longer take effect after sign-in.`,
                            () =>
                              void run(
                                () => revokeGrant(v.id, grant.id, development),
                                "Pending access cancelled.",
                              ),
                            { confirmLabel: "Cancel access" },
                          )
                        }
                      />
                    </View>
                  ))
                ) : (
                  <AppText muted>No pending access grants.</AppText>
                )}
              </Card>
              {revokedMembers.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <SectionHeading
                    title={`Revoked members (${revokedMembers.length})`}
                  />
                  <AppText muted>
                    Open a member to review or restore their access.
                  </AppText>
                  {revokedMembers.map(memberRow)}
                </Card>
              )}
            </>
          )}
          {releaseFeatures.advancedTools && query.data && (
            <Card style={{ padding: 16 }}>
              <SectionHeading title="Pilot defaults" />
              <AppText muted>
                Defaults apply to Pilots who have no personal override for that
                permission.
              </AppText>
              <TextAction
                label={
                  showDefaults
                    ? "Hide default permissions"
                    : "Edit default permissions"
                }
                icon="options-outline"
                onPress={() => {
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
                  <AppButton
                    label="Save vehicle defaults"
                    disabled={locked || busy || !pilotPolicy.data || !defaults}
                    onPress={() =>
                      void run(async () => {
                        await saveDefaults(v.id, defaults!, development);
                        setDefaults(null);
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
        <AppText large>Add vehicle member</AppText>
        <AppText muted>
          For {v?.nickname || v?.registration_number || "this vehicle"}. Choose
          an email and role. Existing verified accounts receive access
          automatically.
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
        <AppText>Choose a role</AppText>
        <RolePicker value={role} onChange={setRole} disabled={busy || locked} />
        {role === "PILOT" && (
          <>
            <AppText large>Pilot permissions</AppText>
            <PermissionEditor
              value={overrides}
              defaults={query.data?.defaults}
              inherited
              onChange={setOverrides}
              disabled={busy || locked}
            />
          </>
        )}
        {!!error && <ErrorState message={error} retry={() => setError("")} />}
        <AppButton
          label="Grant access"
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
                development,
              );
              setEmail("");
              setRole("PILOT");
              setOverrides({});
              setShowGrant(false);
            }, r("grantSaved"))
          }
        />
        <AppButton
          secondary
          label="Cancel"
          disabled={busy}
          onPress={closeGrant}
        />
      </Sheet>
      <Sheet visible={!!selected} onClose={closeMember}>
        {selected && (
          <>
            <AppText large>{selected.display_name || "Vehicle member"}</AppText>
            <AppText muted>
              {selected.status === "ACTIVE"
                ? "Active access"
                : "Access revoked"}{" "}
              · {v?.nickname || v?.registration_number || "this vehicle"}
            </AppText>
            {selected.is_primary_admin && (
              <AppText muted>
                The primary administrator is protected and cannot be demoted or
                removed here.
              </AppText>
            )}
            {locked && (
              <AppText muted>
                Restore this vehicle before changing access.
              </AppText>
            )}
            <AppText>Role</AppText>
            <RolePicker
              value={selected.role}
              disabled={busy || locked || selected.is_primary_admin}
              onChange={(role) => setSelected({ ...selected, role })}
            />
            {selected.role === "PILOT" && (
              <>
                <AppText large>Pilot permissions</AppText>
                <PermissionEditor
                  value={selected.permission_overrides}
                  defaults={query.data?.defaults}
                  inherited
                  onChange={(permission_overrides) =>
                    setSelected({ ...selected, permission_overrides })
                  }
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
                  label="Save changes"
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
                          development,
                        );
                        setSelected(null);
                      });
                    const original = query.data?.members.find(
                      (member) => member.user_id === selected.user_id,
                    );
                    if (selected.role === "OWNER" && original?.role !== "OWNER")
                      ConfirmDialog(
                        "Make this member an Owner?",
                        "Owners can manage vehicle records, members and access. Confirm this broader role for this vehicle.",
                        save,
                        { confirmLabel: "Make Owner" },
                      );
                    else save();
                  }}
                />
                <AppButton
                  secondary
                  label="Revoke access"
                  disabled={busy || locked || selected.is_primary_admin}
                  onPress={() =>
                    ConfirmDialog(
                      "Revoke vehicle access?",
                      "This member will lose access to this vehicle. Existing copies they exported may remain outside the app.",
                      () =>
                        void run(async () => {
                          await changeMember(
                            v!.id,
                            selected.user_id,
                            selected.role,
                            selected.permission_overrides,
                            "REVOKED",
                            development,
                          );
                          setSelected(null);
                        }, "Vehicle access revoked."),
                      { confirmLabel: "Revoke access" },
                    )
                  }
                />
              </>
            ) : (
              <AppButton
                label="Restore access"
                disabled={busy || locked || !pilotPolicy.data}
                onPress={() =>
                  ConfirmDialog(
                    "Restore vehicle access?",
                    "This will give this member access with the role and permissions shown above.",
                    () =>
                      void run(async () => {
                        await changeMember(
                          v!.id,
                          selected.user_id,
                          selected.role,
                          selected.permission_overrides,
                          "ACTIVE",
                          development,
                        );
                        setSelected(null);
                      }, "Vehicle access restored."),
                    { confirmLabel: "Restore access" },
                  )
                }
              />
            )}
            <AppButton
              secondary
              label="Cancel"
              disabled={busy}
              onPress={closeMember}
            />
          </>
        )}
      </Sheet>
    </>
  );
}
