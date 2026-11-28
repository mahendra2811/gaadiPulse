import { PopupBackground } from "@/src/components/ui/Popup";
import { ConfirmationHost } from "@/src/components/ui/ConfirmationHost";
import { MoreDrawerProvider } from "@/src/components/navigation/MoreDrawer";
import { useMembershipUpdates } from "@/src/hooks/useMembershipUpdates";
import {
  keepsAuthenticatedAuthScreen,
  profileRedirect,
} from "@/src/features/auth/routing";
import { AppState, View, Appearance, Platform } from "react-native";
import { AuthLayout } from "@/src/features/auth/AuthLayout";
import { useConnectivity } from "@/src/lib/connectivity";
import { ErrorBoundary } from "@/src/components/ui/ErrorBoundary";
import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
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
import { setLocale, t } from "@/src/lib/i18n";
import { useLocaleSubscription } from "@/src/hooks/useLocale";
import { queryRetryDelay, shouldRetryQuery } from "@/src/lib/query";
import { releaseFeatures } from "@/src/features/release/scope";
import {
  clearDeviceNotifications,
  startReminderFeedback,
  watchPushToken,
} from "@/src/features/reminders/notifications";
import * as Notifications from "expo-notifications";
import { markNotificationRead } from "@/src/features/notifications/api";
import type { Kind } from "@/src/features/records/schema";
const query = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      networkMode: "always",
      refetchOnWindowFocus: true,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
    },
    mutations: { retry: false, networkMode: "always" },
  },
});
function ReminderFeedback() {
  const user = useAccountId();
  const { development } = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (releaseFeatures.advancedTools && Platform.OS !== "web") {
      if (user) {
        const stopFeedback = startReminderFeedback(user, () => {
          void queryClient.invalidateQueries({
            queryKey: [user, "notification-inbox"],
          });
          void queryClient.invalidateQueries({
            queryKey: [user, "notification-unread-count"],
          });
        });
        const stopTokenRefresh = watchPushToken(user, development);
        return () => {
          stopFeedback();
          stopTokenRefresh();
        };
      }
      return;
    }
    let alive = true;
    void clearDeviceNotifications(user)
      .then(() => {
        if (alive) setError("");
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, [user, attempt, development, queryClient]);
  return error ? (
    <ErrorState
      message={error}
      retry={() => setAttempt((value) => value + 1)}
    />
  ) : null;
}
function DeferredStartupTasks() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(task);
  }, []);
  if (!ready) return null;
  return <ReminderFeedback />;
}
function Routes() {
  useConnectivity();
  useMembershipUpdates();
  useLocaleSubscription();
  const auth = useSession();
  const profile = useProfile();
  useEffect(() => {
    if (profile.data?.locale) setLocale(profile.data.locale);
  }, [profile.data?.locale]);
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
    if (auth.loading || Platform.OS === "web") return;
    const user = auth.session?.user.id ?? null;
    const routeFromResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      const data = response.notification.request.content.data;
      if (!data || typeof data !== "object") {
        Notifications.clearLastNotificationResponse();
        return;
      }
      const value = data as Record<string, unknown>;
      let routeData: Record<string, unknown> | null = null;
      let inboxId: string | null = null;
      if (value.type === "gaadipulse.reminder") {
        if (!user || value.accountId !== user) {
          Notifications.clearLastNotificationResponse();
          return;
        }
        routeData = {
          kind: "reminders",
          record_id: value.reminderId,
          vehicle_id: value.vehicleId,
        };
      } else if (value.type === "gaadipulse.notification") {
        if (!user || value.recipient_id !== user) {
          Notifications.clearLastNotificationResponse();
          return;
        }
        routeData =
          value.route_data && typeof value.route_data === "object"
            ? (value.route_data as Record<string, unknown>)
            : null;
        inboxId =
          typeof value.notification_id === "string"
            ? value.notification_id
            : null;
      }
      if (!routeData) return;
      const kind = routeData.kind;
      const id = routeData.record_id;
      const vehicle = routeData.vehicle_id;
      if (
        typeof kind === "string" &&
        ["reminders", "documents", "expenses"].includes(kind) &&
        typeof id === "string" &&
        typeof vehicle === "string"
      ) {
        router.push({
          pathname: "/records/[kind]/[action]",
          params: { kind: kind as Kind, action: id, vehicle },
        });
        if (inboxId && user) {
          void markNotificationRead(inboxId)
            .then(() => {
              void query.invalidateQueries({
                queryKey: [user, "notification-inbox"],
              });
              void query.invalidateQueries({
                queryKey: [user, "notification-unread-count"],
              });
            })
            .catch(() => {});
        }
      } else {
        router.push("/notifications");
      }
      Notifications.clearLastNotificationResponse();
    };
    const initial = Notifications.getLastNotificationResponse();
    if (initial) routeFromResponse(initial);
    const subscription =
      Notifications.addNotificationResponseReceivedListener(routeFromResponse);
    return () => subscription.remove();
  }, [auth.loading, auth.session?.user.id, router]);
  useEffect(() => {
    if (auth.loading || (auth.error && !auth.session && !auth.development))
      return;
    const path = segments[0];
    if (!auth.session && !auth.development && path !== "auth")
      router.replace("/auth/login");
    if (
      (auth.session || auth.development) &&
      !profile.isPending &&
      !profile.error
    ) {
      const destination = profileRedirect(
        pathname,
        !!profile.data?.display_name?.trim(),
      );
      if (destination) router.replace(destination as "/(tabs)" | "/onboarding");
    }
  }, [
    auth.loading,
    auth.session,
    auth.development,
    auth.error,
    profile.isPending,
    profile.error,
    profile.data?.display_name,
    segments,
    pathname,
    router,
  ]);
  if (auth.loading && !auth.session && !auth.development)
    return (
      <ThemeContext.Provider value="system">
        <AuthLayout
          title={t("authRestoreTitle")}
          subtitle={t("authRestoreHint")}
          loading
        >
          <Skeleton />
        </AuthLayout>
      </ThemeContext.Provider>
    );
  if (auth.error && !auth.session && !auth.development)
    return (
      <Screen title={t("sessionError")}>
        <ErrorState message={auth.error} retry={auth.retry} />
        <AppButton
          secondary
          label={t("logout")}
          onPress={() => void auth.signOut().catch(auth.retry)}
        />
      </Screen>
    );
  if (
    (auth.session || auth.development) &&
    profile.isPending &&
    !keepsAuthenticatedAuthScreen(pathname)
  )
    return (
      <ThemeContext.Provider value="system">
        <AuthLayout
          title={t("authRestoreTitle")}
          subtitle={t("authRestoreHint")}
          loading
        >
          <Skeleton />
        </AuthLayout>
      </ThemeContext.Provider>
    );
  if (
    (auth.session || auth.development) &&
    profile.error &&
    !keepsAuthenticatedAuthScreen(pathname)
  )
    return (
      <ThemeContext.Provider value="system">
        <AuthLayout title={t("profile")} subtitle={t("profileLoadError")}>
          <ErrorState
            message={profile.error.message}
            retry={() => void profile.refetch()}
          />
          <AppButton
            secondary
            label={t("logout")}
            onPress={() => void auth.signOut().catch(auth.retry)}
          />
        </AuthLayout>
      </ThemeContext.Provider>
    );
  return (
    <ThemeContext.Provider value={profile.data?.theme ?? "system"}>
      <StatusBar style="auto" />
      <ToastProvider>
        <DeferredStartupTasks />
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
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={query}>
        <SessionProvider>
          <ErrorBoundary>
            <PopupBackground>
              <Routes />
            </PopupBackground>
          </ErrorBoundary>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
