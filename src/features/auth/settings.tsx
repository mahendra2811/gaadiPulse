import { AuthLayout } from "./AuthLayout";
import { ProfileIconPicker } from "./ProfileIconPicker";
import { CountryField } from "./CountryField";
import { defaultProfileIcon, type ProfileIcon } from "./avatars";
import { releaseFeatures } from "@/src/features/release/scope";
import { TimezoneField } from "@/src/features/garage/TimezoneField";
import { errorMessage } from "@/src/lib/errors";
import { MenuRow, SectionHeading, InfoRows } from "@/src/components/ui/premium";
import { SignOutButton } from "./SignOutButton";
import { notificationPermission } from "@/src/features/reminders/notifications";
import { r } from "@/src/features/records/copy";
import { useEffect, useState, useRef } from "react";
import { router, usePreventRemove } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile, updateProfile, updateAppearance } from "./profile";
import { useSession, useAccountId } from "./session";
import {
  Card,
  Screen,
  AppButton,
  AppText,
  InputField,
  ConfirmDialog,
  ErrorState,
  useToast,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import type { ThemeMode } from "@/src/lib/theme";
import { Image, Pressable, View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { artwork } from "@/src/lib/assets";
export { MoreDrawerRoute as More } from "@/src/components/navigation/MoreDrawer";
export function Settings() {
  const toast = useToast();
  const [error, setError] = useState("");
  const [themeBusy, setThemeBusy] = useState(false);
  const profile = useProfile();
  const user = useAccountId();
  const auth = useSession();
  const queryClient = useQueryClient();
  const colors = useTheme();
  const changeTheme = async (theme: ThemeMode) => {
    if (!user || themeBusy || !profile.data || profile.data.theme === theme)
      return;
    setError("");
    setThemeBusy(true);
    try {
      await updateAppearance(user, theme, auth.development);
      queryClient.setQueryData([user, "profile"], { ...profile.data, theme });
      await queryClient.invalidateQueries({ queryKey: [user, "profile"] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setThemeBusy(false);
    }
  };
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
          onPress={() => router.push("/settings/deletion")}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("uiPreferences")} />
        <AppText>{t("appearance")}</AppText>
        <AppText muted>
          Choose one appearance. System default follows your device.
        </AppText>
        {profile.error ? (
          <ErrorState
            message={profile.error.message}
            retry={() => void profile.refetch()}
          />
        ) : (
          <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
            {(
              [
                ["system", "System default", "phone-portrait-outline"],
                ["light", "Light", "sunny-outline"],
                ["dark", "Dark", "moon-outline"],
              ] as const
            ).map(([mode, label, icon]) => (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{
                  checked: profile.data?.theme === mode,
                  disabled: themeBusy || !profile.data,
                }}
                disabled={themeBusy || !profile.data}
                onPress={() => void changeTheme(mode)}
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor:
                    profile.data?.theme === mode ? colors.primary : colors.line,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <Ionicons name={icon} size={20} color={colors.ink} />
                <Text style={{ color: colors.ink, flex: 1 }}>{label}</Text>
                <Ionicons
                  name={
                    profile.data?.theme === mode
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={22}
                  color={
                    profile.data?.theme === mode ? colors.primary : colors.muted
                  }
                />
              </Pressable>
            ))}
          </View>
        )}
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (query.data && !hydrated.current) {
      hydrated.current = true;
      /* Server profile initializes an editable local draft after fetch. */
      const signupName = auth.session?.user.user_metadata?.full_name;
      setName(
        query.data.display_name ||
          (typeof signupName === "string"
            ? signupName.trim().slice(0, 120)
            : ""),
      );
      setCountry(query.data.country_code);
      setAvatar(query.data.avatar_icon);
      setTimezone(query.data.timezone);
      setInitialized(true);
    }
  }, [query.data, auth.session?.user.user_metadata?.full_name]);
  const dirty =
    initialized &&
    !!query.data &&
    (country !== query.data.country_code ||
      avatar !== query.data.avatar_icon ||
      name !== query.data.display_name ||
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
      let current = query.data;
      if (
        (avatar !== current?.avatar_icon && !current?.avatar_available) ||
        (country !== current?.country_code && !current?.country_available)
      ) {
        const refreshed = await query.refetch();
        if (refreshed.error) throw refreshed.error;
        current = refreshed.data;
      }
      if (!current) throw new Error(t("profileLoadError"));
      if (country !== current.country_code && !current.country_available)
        throw new Error(t("countrySetup"));
      if (avatar !== current.avatar_icon && !current.avatar_available)
        throw new Error(t("profileIconSetup"));
      await updateProfile(
        user,
        {
          display_name: name.trim(),
          ...(current.avatar_available ? { avatar_icon: avatar } : {}),
          ...(country !== current.country_code
            ? { country_code: country }
            : {}),
          theme: current.theme,
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
        <Image
          accessibilityLabel={t("app")}
          source={artwork.logoCircle}
          resizeMode="contain"
          style={{ width: 54, height: 54 }}
        />
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
