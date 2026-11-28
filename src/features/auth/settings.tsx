import { AuthLayout } from "./AuthLayout";
import { ProfileIconPicker } from "./ProfileIconPicker";
import { CountryField } from "./CountryField";
import { defaultProfileIcon, type ProfileIcon } from "./avatars";
import { releaseFeatures } from "@/src/features/release/scope";
import { TimezoneField } from "@/src/features/garage/TimezoneField";
import { errorMessage } from "@/src/lib/errors";
import { MenuRow, SectionHeading, InfoRows } from "@/src/components/ui/premium";
import { SignOutButton } from "./SignOutButton";
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
import { setLocale, t } from "@/src/lib/i18n";
import { LocaleField } from "./LocaleField";
import { resolveTheme, useThemeMode, type ThemeMode } from "@/src/lib/theme";
import {
  Image,
  Linking,
  Pressable,
  Share,
  View,
  Text,
  useColorScheme,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { artwork } from "@/src/lib/assets";
import {
  checkAndStartPlayUpdate,
  openPlayStore,
  PLAY_STORE_URL,
  PLAY_REVIEW_URL,
} from "./playStore";
export { MoreDrawerRoute as More } from "@/src/components/navigation/MoreDrawer";
export function Settings() {
  const [error, setError] = useState("");
  const [themeBusy, setThemeBusy] = useState(false);
  const profile = useProfile();
  const user = useAccountId();
  const auth = useSession();
  const queryClient = useQueryClient();
  const colors = useTheme();
  const [localeBusy, setLocaleBusy] = useState(false);
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
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionHeading title={t("uiPreferences")} />
        <AppText>{t("appearance")}</AppText>
        {profile.error ? (
          <ErrorState
            message={profile.error.message}
            retry={() => void profile.refetch()}
          />
        ) : (
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", gap: 8 }}
          >
            {(
              [
                ["system", t("themeSystem"), "phone-portrait-outline"],
                ["light", t("themeLight"), "sunny-outline"],
                ["dark", t("themeDark"), "moon-outline"],
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
                  minHeight: 64,
                  flex: 1,
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 8,
                  borderWidth: profile.data?.theme === mode ? 2 : 1,
                  borderColor:
                    profile.data?.theme === mode ? colors.primary : colors.line,
                  borderRadius: 12,
                  backgroundColor:
                    profile.data?.theme === mode
                      ? colors.background
                      : colors.surface,
                }}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={
                    profile.data?.theme === mode ? colors.primary : colors.muted
                  }
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color:
                      profile.data?.theme === mode
                        ? colors.primary
                        : colors.ink,
                    fontSize: 13,
                    fontWeight: profile.data?.theme === mode ? "700" : "500",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 23 }}>
          System follows your device appearance.
        </Text>
        {profile.data && (
          <LocaleField
            value={profile.data.locale}
            disabled={localeBusy}
            onChange={(locale) => {
              if (!user || !profile.data || localeBusy) return;
              setLocaleBusy(true);
              setLocale(locale);
              void updateProfile(user, {
                display_name: profile.data.display_name,
                theme: profile.data.theme,
                timezone: profile.data.timezone,
                locale,
              })
                .then(() =>
                  queryClient.setQueryData([user, "profile"], {
                    ...profile.data,
                    locale,
                  }),
                )
                .catch((e) => {
                  setLocale(profile.data!.locale);
                  setError(errorMessage(e));
                })
                .finally(() => setLocaleBusy(false));
            }}
          />
        )}
        {releaseFeatures.advancedTools && (
          <MenuRow
            label={t("notifications.preferences")}
            icon="notifications"
            tone="coral"
            onPress={() => router.push("/settings/notifications")}
          />
        )}
      </Card>
      <Card style={{ padding: 16 }}>
        <MenuRow
          label={r("help")}
          icon="help-buoy"
          tone="amber"
          onPress={() => router.push("/settings/help")}
        />
        <MenuRow
          label={t("about")}
          subtitle={t("appPlayPageHint")}
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
  const isDirty = dirty;
  const disablePrevention = usePreventRemove(
    isDirty && !leaving,
    ({ repeat }) =>
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
  const dark = resolveTheme(useThemeMode(), useColorScheme()) === "dark";
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const toast = useToast();
  const sendFeedback = async () => {
    try {
      await Linking.openURL(
        "mailto:mahendrapuniya92@gmail.com?subject=GaadiPulse%20feedback",
      );
    } catch {
      toast(t("feedbackUnavailable"), "warning");
    }
  };
  const shareApp = async () => {
    try {
      await Share.share({
        title: t("app"),
        message: `${t("app")} — ${t("tagline")}\n${PLAY_STORE_URL}`,
      });
    } catch {
      toast(t("feedbackUnavailable"), "warning");
    }
  };
  const checkForUpdates = async () => {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    try {
      const result = await checkAndStartPlayUpdate();
      if (result === "current") toast(t("appUpToDate"), "success");
    } catch {
      toast(t("updateCheckFailed"), "warning");
      try {
        await openPlayStore();
      } catch {
        // Toast already gives a recovery path if the store app is unavailable.
      }
    } finally {
      setCheckingUpdates(false);
    }
  };
  return (
    <Screen title={t("about")} compact>
      <Card style={{ padding: 18 }}>
        <Image
          accessibilityLabel={t("app")}
          source={dark ? artwork.logoCircle : artwork.logoWhiteBackground}
          resizeMode="contain"
          style={{ width: 54, height: 54 }}
        />
        <AppText large>{t("app")}</AppText>
        <AppText muted>{t("tagline")}</AppText>
      </Card>
      <Card style={{ padding: 16 }}>
        <AppText large>{t("appSupportAndUpdates")}</AppText>
        <AppButton
          secondary
          label={
            checkingUpdates ? t("checkingForUpdates") : t("checkForUpdates")
          }
          disabled={checkingUpdates}
          onPress={() => void checkForUpdates()}
        />
        <MenuRow
          label={t("appPlayPage")}
          subtitle={t("appPlayPageHint")}
          icon="open-outline"
          tone="violet"
          onPress={() => void openPlayStore()}
        />
        <MenuRow
          label={t("rateApp")}
          subtitle={t("rateAppHint")}
          icon="star-outline"
          tone="amber"
          onPress={() => void openPlayStore(PLAY_REVIEW_URL)}
        />
        <MenuRow
          label={t("shareApp")}
          subtitle={t("shareAppHint")}
          icon="share-social-outline"
          tone="mint"
          onPress={() => void shareApp()}
        />
        <MenuRow
          label={t("feedback")}
          subtitle={t("feedbackHint")}
          icon="chatbox-ellipses-outline"
          tone="coral"
          onPress={() => void sendFeedback()}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <AppText>{t("roleInfo")}</AppText>
        <MenuRow
          label={t("account.legal")}
          icon="document-text"
          tone="amber"
          onPress={() => router.push("/auth/legal")}
        />
      </Card>
    </Screen>
  );
}
