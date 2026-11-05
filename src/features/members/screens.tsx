import { releaseFeatures } from "@/src/features/release/scope";
import { t } from "@/src/lib/i18n";
import { Timestamp } from "@/src/components/ui/Timestamp";
import {
  MenuRow,
  ColorIcon,
  Expandable,
  SectionHeading,
  TextAction,
} from "@/src/components/ui/premium";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { permissionLabel } from "@/src/features/records/categories";
import { useState } from "react";
import { Switch, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/src/lib/query";
import { z } from "zod";
import { router, useLocalSearchParams } from "expo-router";
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
import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { usePermissions } from "@/src/features/records/hooks";
import { requirePilotPolicy } from "./pilotPolicy";
import { r } from "@/src/features/records/copy";
import {
  members,
  grantAccess,
  changeMember,
  revokeGrant,
  saveDefaults,
  permissionKeys,
  type Member,
} from "./api";
export function PermissionEditor({
  value,
  onChange,
}: {
  value: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {permissionKeys
        .filter((key) =>
          [
            "fuel.read",
            "fuel.create",
            "expenses.read",
            "expenses.create",
            "meters.read",
            "meters.create",
          ].includes(key),
        )
        .map((key) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <AppText>{permissionLabel(key)}</AppText>
            <Switch
              accessibilityLabel={permissionLabel(key)}
              value={value[key] !== false}
              onValueChange={(enabled) =>
                onChange({ ...value, [key]: enabled })
              }
            />
          </View>
        ))}
    </View>
  );
}
export default function Members() {
  const { vehicle: vehicleId, add } = useLocalSearchParams<{
    vehicle?: string;
    add?: string;
  }>();
  const active = useActiveVehicle();
  const vehicle = vehicleId
    ? active.data?.find((item) => item.id === vehicleId)
    : active.vehicle;
  return (
    <MembersForVehicle
      key={`${vehicleId ?? vehicle?.id ?? "none"}:${add ?? ""}`}
      vehicle={vehicle}
      loading={active.isPending}
      vehicleError={active.error}
      retryVehicle={() => void active.refetch()}
      openGrant={add === "1"}
    />
  );
}
function MembersForVehicle({
  vehicle: v,
  loading,
  vehicleError,
  retryVehicle,
  openGrant,
}: {
  vehicle: ReturnType<typeof useActiveVehicle>["vehicle"];
  loading: boolean;
  vehicleError: Error | null;
  retryVehicle: () => void;
  openGrant: boolean;
}) {
  const user = useAccountId();
  const { development } = useSession();
  const access = usePermissions(v?.id);
  const qc = useQueryClient();
  const toast = useToast();
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
  const [showOverrides, setShowOverrides] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const run = async (action: () => Promise<void>, message = r("saved")) => {
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
  if (vehicleError)
    return (
      <Screen title={r("members")}>
        <ErrorState message={vehicleError.message} retry={retryVehicle} />
      </Screen>
    );
  if (!v && !loading)
    return (
      <Screen title={r("members")}>
        <AppText>{r("noVehicle")}</AppText>
        <AppButton secondary label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  if (access.error)
    return (
      <Screen title={r("members")}>
        <ErrorState
          message={access.error.message}
          retry={() => void access.refetch()}
        />
        <AppButton secondary label={r("back")} onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen
      compact
      title={r("members")}
      loading={
        loading ||
        (!!v && access.isPending) ||
        (query.isPending && !!access.data?.owner) ||
        busy
      }
    >
      <VehicleHeader vehicleId={v?.id} />
      {access.data && !access.data.owner ? (
        <AppText>{r("permission")}</AppText>
      ) : access.data?.owner && v ? (
        <>
          {pilotPolicy.error && (
            <ErrorState
              message={pilotPolicy.error.message}
              retry={() => void pilotPolicy.refetch()}
            />
          )}
          <SectionHeading
            title={r("members")}
            action={r("grant")}
            onAction={() => setShowGrant((value) => !value)}
          />
          <Expandable expanded={showGrant}>
            <Card style={{ padding: 16, gap: 10 }}>
              <ColorIcon name="people" tone="violet" />
              <AppText large>{r("grant")}</AppText>
              <AppText>{r("grantHelp")}</AppText>
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
              <FilterChips
                items={[
                  { id: "OWNER", label: r("OWNER") },
                  { id: "PILOT", label: r("PILOT") },
                ]}
                value={role}
                onChange={(value) => setRole(value as "OWNER" | "PILOT")}
              />
              {role === "PILOT" && (
                <AppText muted>{t("pilotAccessHint")}</AppText>
              )}
              {role === "PILOT" && (
                <TextAction
                  label={r("permissions")}
                  icon="options-outline"
                  onPress={() => setShowOverrides((value) => !value)}
                />
              )}
              {role === "PILOT" && (
                <Expandable expanded={showOverrides}>
                  <PermissionEditor
                    value={
                      Object.keys(overrides).length
                        ? overrides
                        : (query.data?.defaults ?? {})
                    }
                    onChange={setOverrides}
                  />
                </Expandable>
              )}
              <AppButton
                disabled={
                  busy ||
                  !v ||
                  !query.data ||
                  !pilotPolicy.data ||
                  !z.email().safeParse(email.trim()).success
                }
                label={r("grant")}
                onPress={() =>
                  void run(async () => {
                    await grantAccess(
                      v!.id,
                      email,
                      role,
                      overrides,
                      development,
                    );
                    setEmail("");
                    setShowGrant(false);
                  }, r("grantSaved"))
                }
              />
            </Card>
          </Expandable>
          {query.error && (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
            />
          )}
          {query.data?.members.map((member) => (
            <Card key={member.user_id} style={{ padding: 14 }}>
              <MenuRow
                label={member.display_name || member.user_id}
                subtitle={`${r(member.role)} · ${member.status}${member.is_primary_admin ? ` · ${r("primary")}` : ""}`}
                icon="person-circle"
                tone={member.role === "OWNER" ? "violet" : "blue"}
                onPress={() =>
                  setSelected({
                    ...member,
                    permission_overrides: {
                      ...query.data?.defaults,
                      ...member.permission_overrides,
                    },
                  })
                }
              />
            </Card>
          ))}
          {query.data?.grants
            .filter((g) => g.status !== "REVOKED")
            .map((grant) => (
              <Card key={grant.id}>
                <AppText>{grant.normalized_email}</AppText>
                <AppText>
                  {r(grant.desired_role)} · {grant.status}
                </AppText>
                <Timestamp value={grant.created_at} timezone={v?.timezone} />
                <AppButton
                  secondary
                  disabled={busy}
                  label={r("revoke")}
                  onPress={() =>
                    ConfirmDialog(
                      r("revoke"),
                      r("revokeBody"),
                      () =>
                        void run(() =>
                          revokeGrant(v!.id, grant.id, development),
                        ),
                    )
                  }
                />
              </Card>
            ))}
          {releaseFeatures.advancedTools && query.data && (
            <>
              <TextAction
                label={r("defaults")}
                icon="options-outline"
                onPress={() => setShowDefaults((value) => !value)}
              />
              <Expandable expanded={showDefaults}>
                <Card style={{ padding: 16 }}>
                  <AppText large>{r("defaults")}</AppText>
                  <AppText muted>{r("permissionHelp")}</AppText>
                  <PermissionEditor
                    value={defaults ?? query.data.defaults}
                    onChange={setDefaults}
                  />
                  <AppButton
                    label={r("saveDefaults")}
                    disabled={busy}
                    onPress={() =>
                      void run(() =>
                        saveDefaults(
                          v!.id,
                          defaults ?? query.data!.defaults,
                          development,
                        ),
                      )
                    }
                  />
                </Card>
              </Expandable>
            </>
          )}
        </>
      ) : null}
      {error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton secondary label={r("back")} onPress={() => router.back()} />
      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <AppText large>{selected.display_name || selected.user_id}</AppText>
            {(["OWNER", "PILOT"] as const).map((role) => (
              <AppButton
                key={role}
                label={r(role)}
                disabled={selected.is_primary_admin}
                secondary={selected.role !== role}
                onPress={() => setSelected({ ...selected, role })}
              />
            ))}
            {selected.role === "PILOT" && (
              <PermissionEditor
                value={selected.permission_overrides}
                onChange={(permission_overrides) =>
                  setSelected({ ...selected, permission_overrides })
                }
              />
            )}
            <AppButton
              disabled={busy || !pilotPolicy.data}
              label={r("save")}
              onPress={() =>
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
                })
              }
            />
            <AppButton
              secondary
              disabled={busy || selected.is_primary_admin}
              label={r("revoke")}
              onPress={() =>
                ConfirmDialog(
                  r("revoke"),
                  r("revokeBody"),
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
                    }),
                )
              }
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
