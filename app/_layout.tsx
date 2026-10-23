import { useMembershipUpdates } from "@/src/hooks/useMembershipUpdates";
import { useOutboxSync } from "@/src/lib/sync/hooks";
import {
  authDestination,
  keepsAuthenticatedAuthScreen,
} from "@/src/features/auth/routing";
import { Image, View, Text, Appearance, Platform } from "react-native";
import { artwork } from "@/src/lib/assets";
import { useConnectivity } from "@/src/lib/connectivity";
import { ErrorBoundary } from "@/src/components/ui/ErrorBoundary";
import "react-native-gesture-handler";
import { useEffect } from "react";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "@/src/features/auth/session";
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
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
function Routes() {
  useConnectivity();
  useMembershipUpdates();
  const syncError = useOutboxSync();
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
        {auth.development && (
          <View style={{ backgroundColor: "#122C2A", padding: 8 }}>
            <Text style={{ color: "#BDF5DC", textAlign: "center" }}>
              {t("developmentBanner")}
            </Text>
          </View>
        )}
        {auth.error && (
          <View style={{ padding: 8 }}>
            <AppText>{auth.error}</AppText>
            <AppButton label={t("retry")} onPress={auth.retry} />
          </View>
        )}
        {syncError && (
          <View style={{ padding: 8 }}>
            <AppText>{syncError}</AppText>
            <AppButton
              label={t("sync")}
              onPress={() => router.push("/settings/sync")}
            />
          </View>
        )}
        <Stack screenOptions={{ headerShown: false }} />
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
