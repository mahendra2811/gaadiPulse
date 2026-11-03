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
import { router } from "expo-router";
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
      {permissionKeys.map((key) => (
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
            value={value[key] === true}
            onValueChange={(enabled) => onChange({ ...value, [key]: enabled })}
          />
        </View>
      ))}
    </View>
  );
}
export default function Members() {
  const active = useActiveVehicle();
  const v = active.vehicle;
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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "PILOT">("PILOT");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [defaults, setDefaults] = useState<Record<string, boolean> | null>(
    null,
  );
  const [selected, setSelected] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showGrant, setShowGrant] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await qc.invalidateQueries();
      toast(r("saved"), "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
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
      loading={(query.isPending && !!access.data?.owner) || busy}
    >
      <VehicleHeader />
      {access.data && !access.data.owner ? (
        <AppText>{r("permission")}</AppText>
      ) : (
        <>
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
                  busy || !v || !z.email().safeParse(email.trim()).success
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
                  })
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
          {query.data && (
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
      )}
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
            <PermissionEditor
              value={selected.permission_overrides}
              onChange={(permission_overrides) =>
                setSelected({ ...selected, permission_overrides })
              }
            />
            <AppButton
              disabled={busy}
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
