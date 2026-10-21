import { VehicleHeader } from "@/src/components/navigation/VehicleHeader";
import { SignOutButton } from "./SignOutButton";
import { notificationPermission } from "@/src/features/reminders/notifications";
import { r } from "@/src/features/records/copy";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { usePermissions } from "@/src/features/records/hooks";
import { useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile, updateProfile } from "./profile";
import { useSession, useAccountId } from "./session";
import {
  Screen,
  AppButton,
  AppText,
  InputField,
  Choice,
  ErrorState,
  useToast,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { draftCount } from "@/src/lib/db";
import type { ThemeMode } from "@/src/lib/theme";
export function More() {
  const active = useActiveVehicle();
  const access = usePermissions(active.vehicle?.id);
  return (
    <Screen title={t("more")}>
      <SignOutButton />
      <VehicleHeader />
      {active.error && (
        <ErrorState
          message={active.error.message}
          retry={() => void active.refetch()}
        />
      )}
      {access.error && (
        <ErrorState
          message={access.error.message}
          retry={() => void access.refetch()}
        />
      )}
      <AppButton label={t("add")} onPress={() => router.push("/garage/add")} />
      {access.data?.["meters.create"] && (
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
      {(["meters", "progress", "documents", "reminders"] as const)
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
              kind === "meters"
                ? router.push("/meters/history")
                : router.push({ pathname: "/records/[kind]", params: { kind } })
            }
          />
        ))}
      {access.data?.["expenses.create"] && (
        <AppButton
          label={r("addMaintenance")}
          onPress={() =>
            router.push({
              pathname: "/records/[kind]/[action]",
              params: { kind: "expenses", action: "add", category: "SERVICE" },
            })
          }
        />
      )}
      {access.data?.["expenses.read"] && (
        <AppButton
          secondary
          label={r("maintenance")}
          onPress={() => router.push("/maintenance")}
        />
      )}
      {access.data?.["reports.read"] && (
        <AppButton
          secondary
          label={r("reports")}
          onPress={() => router.push("/reports")}
        />
      )}
      {access.data?.owner && (
        <>
          <AppButton
            secondary
            label={r("members")}
            onPress={() => router.push("/owner/members")}
          />
          <AppButton
            secondary
            label={r("builder")}
            onPress={() => router.push("/owner/form-builder")}
          />
        </>
      )}
      <AppButton
        secondary
        label={r("security")}
        onPress={() => router.push("/settings/security")}
      />
      <AppButton
        secondary
        label={r("help")}
        onPress={() => router.push("/settings/help")}
      />
      {(
        [
          { key: "garage", href: "/garage" },
          { key: "profile", href: "/settings/profile" },
          { key: "settings", href: "/settings" },
          { key: "sync", href: "/settings/sync" },
          { key: "about", href: "/settings/about" },
        ] as const
      ).map((item) => (
        <AppButton
          key={item.key}
          secondary
          label={t(item.key)}
          onPress={() => router.push(item.href)}
        />
      ))}
    </Screen>
  );
}
export function Settings() {
  const auth = useSession();
  const toast = useToast();
  const [error, setError] = useState("");
  return (
    <Screen title={t("settings")}>
      <AppButton
        label={t("profile")}
        onPress={() => router.push("/settings/profile")}
      />
      {__DEV__ && !auth.development && (
        <AppButton
          secondary
          label={t("developmentContinue")}
          onPress={() =>
            void auth.startDevelopment().catch((e) => setError(String(e)))
          }
        />
      )}
      <AppButton
        secondary
        label={r("notificationPermission")}
        onPress={() => {
          void notificationPermission()
            .then((allowed) =>
              toast(
                r(allowed ? "notificationsEnabled" : "notificationDenied"),
                allowed ? "info" : "warning",
              ),
            )
            .catch((e) => setError(String(e)));
        }}
      />
      <AppText>{t("language")}</AppText>
      <AppText>{t("english")}</AppText>
      <AppButton label={t("hindi")} disabled onPress={() => undefined} />
      <AppButton
        secondary
        label={t("appearance")}
        onPress={() => router.push("/settings/profile")}
      />
      <AppButton
        secondary
        label={t("legal")}
        onPress={() => router.push("/auth/legal")}
      />
      <SignOutButton />
      {error && <ErrorState message={error} retry={() => setError("")} />}
    </Screen>
  );
}
export function Profile() {
  const auth = useSession();
  const user = useAccountId();
  const query = useProfile();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const hydrated = useRef(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (query.data && !hydrated.current) {
      hydrated.current = true;
      /* Server profile initializes an editable local draft after fetch. */
      setName(query.data.display_name);
      setTheme(query.data.theme);
      setTimezone(query.data.timezone);
    }
  }, [query.data]);
  const save = async () => {
    setBusy(true);
    try {
      if (!user) return;
      if (!name.trim() || name.trim().length > 120) throw new Error(t("name"));
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      await updateProfile(
        user,
        {
          display_name: name.trim(),
          theme,
          timezone,
        },
        auth.development,
      );
      await qc.invalidateQueries({
        queryKey: [user, "profile"],
      });
      toast(t("saved"));
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={t("profile")}
      loading={query.isPending || busy}
      action={
        <AppButton
          label={t("save")}
          disabled={busy || query.isPending}
          onPress={() => void save()}
        />
      }
    >
      <InputField label={t("name")} value={name} onChangeText={setName} />
      <InputField
        label={t("timezone")}
        value={timezone}
        onChangeText={setTimezone}
      />
      <AppText>{t("appearance")}</AppText>
      <Choice
        values={["light", "dark", "system"] as const}
        value={theme}
        onChange={setTheme}
      />
      {query.error && (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      )}
      {error && <ErrorState message={error} retry={() => setError("")} />}
    </Screen>
  );
}
export function Sync() {
  const user = useAccountId();
  const query = useQuery({
    queryKey: [user, "draft-count"],
    queryFn: () => draftCount(user!),
    enabled: !!user,
  });
  return (
    <Screen title={t("sync")} loading={query.isPending}>
      <AppText>{t("syncBody")}</AppText>
      <AppText>
        {t("draftCount")}: {query.data ?? "—"}
      </AppText>
      <AppText>{t("noPending")}</AppText>
      <AppButton label={t("refresh")} onPress={() => void query.refetch()} />
      {query.error && (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      )}
    </Screen>
  );
}
export function About() {
  return (
    <Screen title={t("about")}>
      <AppText large>{t("app")}</AppText>
      <AppText>{t("tagline")}</AppText>
      <AppText>{t("roleInfo")}</AppText>
      <AppButton
        label={t("legal")}
        onPress={() => router.push("/auth/legal")}
      />
    </Screen>
  );
}
