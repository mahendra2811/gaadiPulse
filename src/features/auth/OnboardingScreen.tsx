import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  AppButton,
  AppText,
  Card,
  ErrorState,
  InputField,
  LoadingLine,
  useToast,
} from "@/src/components/ui";
import { artwork } from "@/src/lib/assets";
import { useTheme } from "@/src/lib/theme";
import { errorMessage } from "@/src/lib/errors";
import { t } from "@/src/lib/i18n";
import { TimezoneField } from "@/src/features/garage/TimezoneField";
import { CountryField } from "./CountryField";
import { SignOutButton } from "./SignOutButton";
import { useProfile, updateProfile } from "./profile";
import { useAccountId, useSession } from "./session";
import {
  onboardingDefaults,
  singleCountryTimezone,
  timezoneAfterCountryChange,
} from "./onboardingDefaults";

const banner = require("@/assets/media/Premium Fleet Management Onboarding Illustration.png");
export default function OnboardingScreen() {
  const c = useTheme(),
    auth = useSession(),
    user = useAccountId(),
    profile = useProfile(),
    qc = useQueryClient(),
    toast = useToast();
  const [name, setName] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [manualZone, setManualZone] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useRef(false);
  const running = useRef(false);
  useEffect(() => {
    if (!profile.data || hydrated.current) return;
    hydrated.current = true;
    const metadataName =
      auth.session?.user.user_metadata?.full_name ??
      auth.session?.user.user_metadata?.name;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const suggestions = onboardingDefaults(locale, deviceZone);
    setName(
      profile.data.display_name ||
        (typeof metadataName === "string"
          ? metadataName.trim().slice(0, 120)
          : ""),
    );
    setCountry(profile.data.country_code ?? suggestions.country);
    setTimezone(
      profile.data.country_code ? profile.data.timezone : suggestions.timezone,
    );
    setReady(true);
  }, [profile.data, auth.session?.user.user_metadata]);
  const save = async () => {
    if (running.current || !user || !profile.data) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      let current = profile.data;
      if (country !== current.country_code && !current.country_available) {
        const refreshed = await profile.refetch();
        if (refreshed.error) throw refreshed.error;
        if (refreshed.data) current = refreshed.data;
      }
      if (country !== current.country_code && !current.country_available)
        throw new Error(t("countrySetup"));
      await updateProfile(
        user,
        {
          display_name: name.trim(),
          theme: current.theme,
          timezone,
          ...(country !== current.country_code
            ? { country_code: country }
            : {}),
        },
        auth.development,
      );
      await qc.invalidateQueries({ queryKey: [user, "profile"] });
      toast(t("saved"), "success");
      router.replace("/(tabs)");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={["top", "left", "right"]}
    >
      <LoadingLine loading={profile.isPending || busy} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
        >
          <View
            style={{
              height: 138,
              width: "100%",
              backgroundColor: "#006F63",
              overflow: "hidden",
            }}
          >
            <Image
              source={banner}
              resizeMode="cover"
              style={{ width: "100%", height: "100%", position: "absolute" }}
            />
            <View
              style={{
                position: "absolute",
                top: 14,
                left: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 6,
                borderRadius: 12,
                backgroundColor: "rgba(0, 55, 48, 0.72)",
              }}
            >
              <View>
                <Image
                  accessibilityLabel={t("app")}
                  source={artwork.wordmarkDark}
                  resizeMode="contain"
                  style={{ width: 172, height: 42 }}
                />
                <Text
                  style={{
                    color: "#E0FAF1",
                    fontSize: 12,
                    fontWeight: "600",
                    paddingLeft: 8,
                  }}
                >
                  {t("tagline")}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={{
              width: "100%",
              maxWidth: 520,
              alignSelf: "center",
              padding: 18,
              gap: 14,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ color: c.ink, fontSize: 27, fontWeight: "800" }}
            >
              {t("onboardingTitle")}
            </Text>
            <AppText muted>{t("onboardingDescription")}</AppText>
            {profile.error ? (
              <ErrorState
                message={profile.error.message}
                retry={() => void profile.refetch()}
              />
            ) : (
              <Card style={{ padding: 16 }}>
                <InputField
                  label={t("name")}
                  required
                  maxLength={120}
                  value={name}
                  onChangeText={setName}
                  editable={!busy && ready}
                  autoCapitalize="words"
                  autoComplete="name"
                />
                {!auth.development && !!auth.session?.user.email && (
                  <AppText muted>{auth.session.user.email}</AppText>
                )}
                <CountryField
                  value={country}
                  disabled={busy || !ready}
                  onChange={(value) => {
                    setCountry(value);
                    setTimezone((current) =>
                      timezoneAfterCountryChange(value, current, manualZone),
                    );
                  }}
                />
                <AppText muted>{t("onboardingCountryHint")}</AppText>
                <TimezoneField
                  value={timezone}
                  account
                  disabled={busy || !ready}
                  onChange={(value) => {
                    setManualZone(true);
                    setTimezone(value);
                  }}
                />
                <AppText muted>
                  {country && !singleCountryTimezone(country)
                    ? t("onboardingTimezoneMultiple")
                    : t("onboardingTimezoneHint")}
                </AppText>
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: c.background,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: c.ink, fontWeight: "700" }}>
                    {t("onboardingCurrency")}
                  </Text>
                  <Text style={{ color: c.muted, lineHeight: 20 }}>
                    {t("onboardingCurrencyHint")}
                  </Text>
                </View>
              </Card>
            )}
            {!!error && (
              <ErrorState message={error} retry={() => void save()} />
            )}
            <AppButton
              label={t("onboardingContinue")}
              disabled={busy || !ready || !!profile.error || !name.trim()}
              onPress={() => void save()}
            />
            <AppText muted>{t("onboardingVehicleHint")}</AppText>
            <SignOutButton />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
