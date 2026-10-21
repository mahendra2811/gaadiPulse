import { Image } from "react-native";
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
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
const query = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
function Routes() {
  useConnectivity();
  const auth = useSession();
  const profile = useProfile();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  useEffect(() => {
    if (auth.loading || auth.error) return;
    const path = segments[0];
    if (!auth.session && path !== "auth") router.replace("/auth/welcome");
    if (
      auth.session &&
      path === "auth" &&
      pathname !== "/auth/legal" &&
      !profile.isPending
    )
      router.replace(
        profile.data?.display_name ? "/(tabs)" : "/settings/profile",
      );
  }, [
    auth.loading,
    auth.session,
    auth.error,
    profile.isPending,
    profile.data?.display_name,
    segments,
    pathname,
    router,
  ]);
  if (auth.loading)
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
  if (auth.error)
    return (
      <Screen title={t("sessionError")}>
        <ErrorState message={auth.error} retry={auth.retry} />
      </Screen>
    );
  return (
    <ThemeContext.Provider value={profile.data?.theme ?? "system"}>
      <StatusBar style="auto" />
      <ToastProvider>
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
