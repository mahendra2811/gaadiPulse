import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile, updateProfile } from "./profile";
import { useSession } from "./session";
import {
  Screen,
  AppButton,
  AppText,
  InputField,
  Choice,
  ErrorState,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { draftCount } from "@/src/lib/db";
import type { ThemeMode } from "@/src/lib/theme";
export function More() {
  return (
    <Screen title={t("more")}>
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
  const [error, setError] = useState("");
  return (
    <Screen title={t("settings")}>
      <AppButton
        label={t("profile")}
        onPress={() => router.push("/settings/profile")}
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
      <AppButton
        secondary
        label={t("logout")}
        onPress={() =>
          ConfirmDialog(t("logout"), t("signoutBody"), () => {
            void auth.signOut().catch((e) => setError(String(e)));
          })
        }
      />
      {error && <ErrorState message={error} retry={() => setError("")} />}
    </Screen>
  );
}
export function Profile() {
  const auth = useSession();
  const query = useProfile();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (query.data) {
      /* Server profile initializes an editable local draft after fetch. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(query.data.display_name);
      setTheme(query.data.theme);
      setTimezone(query.data.timezone);
    }
  }, [query.data]);
  const save = async () => {
    setBusy(true);
    try {
      if (!auth.session) return;
      if (!name.trim() || name.trim().length > 120) throw new Error(t("name"));
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      await updateProfile(auth.session.user.id, {
        display_name: name.trim(),
        theme,
        timezone,
      });
      await qc.invalidateQueries({
        queryKey: [auth.session.user.id, "profile"],
      });
      toast(t("saved"));
      router.replace("/(tabs)");
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
  const { session } = useSession();
  const query = useQuery({
    queryKey: [session?.user.id, "draft-count"],
    queryFn: () => draftCount(session!.user.id),
    enabled: !!session,
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
