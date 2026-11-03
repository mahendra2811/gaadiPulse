import { releaseFeatures } from "@/src/features/release/scope";
import {
  clearDeviceNotifications,
  startReminderFeedback,
} from "@/src/features/reminders/notifications";
import { ConfirmationHost } from "@/src/components/ui/ConfirmationHost";
import { MoreDrawerProvider } from "@/src/components/navigation/MoreDrawer";
import { useMembershipUpdates } from "@/src/hooks/useMembershipUpdates";
import {
  authDestination,
  keepsAuthenticatedAuthScreen,
} from "@/src/features/auth/routing";
import { Image, View, Appearance, Platform } from "react-native";
import { artwork } from "@/src/lib/assets";
import { useConnectivity } from "@/src/lib/connectivity";
import { ErrorBoundary } from "@/src/components/ui/ErrorBoundary";
import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  SessionProvider,
  useSession,
  useAccountId,
} from "@/src/features/auth/session";
import { useProfile } from "@/src/features/auth/profile";
import { ThemeContext } from "@/src/lib/theme";
import {
  ToastProvider,
  Screen,
  ErrorState,
  Skeleton,
  AppText,
  AppButton,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
const query = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0, gcTime: 0, networkMode: "always" },
    mutations: { retry: false, networkMode: "always" },
  },
});
function ReminderFeedback() {
  const user = useAccountId();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (releaseFeatures.advancedTools) {
      if (user) return startReminderFeedback(user);
      return;
    }
    let alive = true;
    void clearDeviceNotifications()
      .then(() => {
        if (alive) setError("");
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, [user, attempt]);
  return error ? (
    <ErrorState
      message={error}
      retry={() => setAttempt((value) => value + 1)}
    />
  ) : null;
}
function Routes() {
  useConnectivity();
  useMembershipUpdates();
  const auth = useSession();
  const profile = useProfile();
  useEffect(() => {
    if (Platform.OS !== "web")
      Appearance.setColorScheme(
        profile.data?.theme === "system" || !profile.data?.theme
          ? "unspecified"
          : profile.data.theme,
      );
  }, [profile.data?.theme]);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  useEffect(() => {
    if (auth.loading || (auth.error && !auth.session && !auth.development))
      return;
    const path = segments[0];
    if (!auth.session && !auth.development && path !== "auth")
      router.replace("/auth/welcome");
    if (
      (auth.session || auth.development) &&
      path === "auth" &&
      !keepsAuthenticatedAuthScreen(pathname) &&
      !profile.isPending
    )
      router.replace(
        authDestination(true, true, !!profile.data?.display_name)!,
      );
  }, [
    auth.loading,
    auth.session,
    auth.development,
    auth.error,
    profile.isPending,
    profile.data?.display_name,
    segments,
    pathname,
    router,
  ]);
  if (auth.loading && !auth.session && !auth.development)
    return (
      <ThemeContext.Provider value="dark">
        <Screen title={t("app")} loading>
          <Image
            source={artwork.logo}
            style={{ width: "100%", height: 200, resizeMode: "contain" }}
          />
          <Skeleton />
        </Screen>
      </ThemeContext.Provider>
    );
  if (auth.error && !auth.session && !auth.development)
    return (
      <Screen title={t("sessionError")}>
        <ErrorState message={auth.error} retry={auth.retry} />
        {__DEV__ && (
          <AppButton
            label={t("developmentContinue")}
            onPress={() => void auth.startDevelopment().catch(auth.retry)}
          />
        )}
        <AppButton
          secondary
          label={t("logout")}
          onPress={() => void auth.signOut().catch(auth.retry)}
        />
      </Screen>
    );
  return (
    <ThemeContext.Provider value={profile.data?.theme ?? "system"}>
      <StatusBar style="auto" />
      <ToastProvider>
        <ReminderFeedback />
        {auth.development && (
          <View style={{ padding: 8 }}>
            <AppText>{t("developmentNotice")}</AppText>
          </View>
        )}
        {auth.error && (
          <View style={{ padding: 8 }}>
            <AppText>{auth.error}</AppText>
            <AppButton label={t("retry")} onPress={auth.retry} />
          </View>
        )}
        <MoreDrawerProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </MoreDrawerProvider>
        <ConfirmationHost />
      </ToastProvider>
    </ThemeContext.Provider>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={query}>
        <SessionProvider>
          <ErrorBoundary>
            <Routes />
          </ErrorBoundary>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
