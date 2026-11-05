import { AuthLayout } from "./AuthLayout";
import { ProfileIconPicker } from "./ProfileIconPicker";
import { CountryField } from "./CountryField";
import { defaultProfileIcon, type ProfileIcon } from "./avatars";
import { releaseFeatures } from "@/src/features/release/scope";
import { TimezoneField } from "@/src/features/garage/TimezoneField";
import { errorMessage } from "@/src/lib/errors";
import {
  MenuRow,
  SectionHeading,
  InfoRows,
  ColorIcon,
} from "@/src/components/ui/premium";
import { SignOutButton } from "./SignOutButton";
import { notificationPermission } from "@/src/features/reminders/notifications";
import { r } from "@/src/features/records/copy";
import { useEffect, useState, useRef } from "react";
import { router, usePreventRemove } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile, updateProfile } from "./profile";
import { useSession, useAccountId } from "./session";
import {
  Card,
  Screen,
  AppButton,
  AppText,
  InputField,
  Choice,
  ConfirmDialog,
  ErrorState,
  useToast,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import type { ThemeMode } from "@/src/lib/theme";
export { MoreDrawerRoute as More } from "@/src/components/navigation/MoreDrawer";
export function Settings() {
  const toast = useToast();
  const [error, setError] = useState("");
  return (
    <Screen title={t("settings")} compact>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("uiAccount")} />
        <MenuRow
          label={t("profile")}
          icon="person-circle"
          tone="violet"
          onPress={() => router.push("/settings/profile")}
        />
        <MenuRow
          label={r("security")}
          icon="shield-checkmark"
          tone="mint"
          onPress={() => router.push("/settings/security")}
        />
        <MenuRow
          label={r("requestDeletion")}
          icon="trash"
          tone="coral"
          onPress={() => router.push("/settings/security")}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("uiPreferences")} />
        <MenuRow
          label={t("appearance")}
          icon="color-palette"
          tone="violet"
          onPress={() => router.push("/settings/profile")}
        />
        <InfoRows items={[{ label: t("language"), value: t("english") }]} />
        <AppText muted>{t("hindi")}</AppText>
        {releaseFeatures.advancedTools && (
          <MenuRow
            label={r("notificationPermission")}
            icon="notifications"
            tone="coral"
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
        )}
      </Card>
      <Card style={{ padding: 16 }}>
        <MenuRow
          label={t("legal")}
          icon="document-text"
          tone="amber"
          onPress={() => router.push("/auth/legal")}
        />
        <MenuRow
          label={r("help")}
          icon="help-buoy"
          tone="amber"
          onPress={() => router.push("/settings/help")}
        />
        <MenuRow
          label={t("about")}
          icon="information-circle"
          tone="blue"
          onPress={() => router.push("/settings/about")}
        />
      </Card>
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
  const [country, setCountry] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<ProfileIcon>(defaultProfileIcon);
  const hydrated = useRef(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (query.data && !hydrated.current) {
      hydrated.current = true;
      /* Server profile initializes an editable local draft after fetch. */
      setName(query.data.display_name);
      setCountry(query.data.country_code);
      setAvatar(query.data.avatar_icon);
      setTheme(query.data.theme);
      setTimezone(query.data.timezone);
      setInitialized(true);
    }
  }, [query.data]);
  const dirty =
    initialized &&
    !!query.data &&
    (country !== query.data.country_code ||
      avatar !== query.data.avatar_icon ||
      name !== query.data.display_name ||
      theme !== query.data.theme ||
      timezone !== query.data.timezone);
  const disablePrevention = usePreventRemove(dirty && !leaving, ({ repeat }) =>
    ConfirmDialog(
      t("unsaved"),
      t("discardUnsaved"),
      () => {
        setLeaving(true);
        repeat();
      },
      { cancelLabel: t("keepEditing"), confirmLabel: t("leaveForm") },
    ),
  );
  const save = async () => {
    setBusy(true);
    try {
      if (!user) return;
      if (!name.trim() || name.trim().length > 120) throw new Error(t("name"));
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      if (
        country !== query.data?.country_code &&
        !query.data?.country_available
      )
        throw new Error(t("countrySetup"));
      if (avatar !== query.data?.avatar_icon && !query.data?.avatar_available)
        throw new Error(t("profileIconSetup"));
      await updateProfile(
        user,
        {
          display_name: name.trim(),
          ...(query.data?.avatar_available ? { avatar_icon: avatar } : {}),
          ...(country !== query.data?.country_code
            ? { country_code: country }
            : {}),
          theme,
          timezone,
        },
        auth.development,
      );
      await qc.invalidateQueries({
        queryKey: [user, "profile"],
      });
      toast(t("saved"), "success");
      setLeaving(true);
      disablePrevention();
      if (!query.data?.display_name) router.replace("/(tabs)");
      else if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const firstSetup = !query.data?.display_name;
  const saveAction = (
    <AppButton
      label={t(firstSetup ? "continue" : "save")}
      disabled={
        busy || !initialized || query.isPending || !!query.error || !name.trim()
      }
      onPress={() => void save()}
    />
  );
  const content = (
    <>
      <ProfileIconPicker
        value={avatar}
        onChange={setAvatar}
        disabled={busy || !initialized}
      />
      <InputField
        label={t("name")}
        required
        maxLength={120}
        value={name}
        onChangeText={setName}
      />
      {!auth.development && !!auth.session?.user.email && (
        <InfoRows
          items={[{ label: t("email"), value: auth.session.user.email }]}
        />
      )}
      <CountryField
        value={country}
        onChange={setCountry}
        disabled={busy || !initialized}
      />
      <TimezoneField
        value={timezone}
        onChange={setTimezone}
        disabled={busy || !initialized}
        account
      />
      <AppText>{t("appearance")}</AppText>
      <Choice
        compact
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
    </>
  );
  return firstSetup ? (
    <AuthLayout
      title={t("authProfileTitle")}
      subtitle={t("authProfileHint")}
      loading={query.isPending || busy}
    >
      {content}
      {saveAction}
      <SignOutButton />
    </AuthLayout>
  ) : (
    <Screen
      compact
      title={t("profile")}
      loading={query.isPending || busy}
      action={saveAction}
    >
      {content}
    </Screen>
  );
}
export function About() {
  return (
    <Screen title={t("about")} compact>
      <Card style={{ padding: 18 }}>
        <ColorIcon name="pulse" tone="mint" size={26} />
        <AppText large>{t("app")}</AppText>
        <AppText muted>{t("tagline")}</AppText>
      </Card>
      <Card style={{ padding: 16 }}>
        <AppText>{t("roleInfo")}</AppText>
        <MenuRow
          label={t("legal")}
          icon="document-text"
          tone="amber"
          onPress={() => router.push("/auth/legal")}
        />
      </Card>
    </Screen>
  );
}
