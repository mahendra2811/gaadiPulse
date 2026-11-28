import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { usePathname } from "expo-router";
import {
  getAnalyticsConsent,
  subscribeAnalyticsConsent,
  trackAnalyticsEvent,
  trackAppForeground,
  trackFirstOpenIfNeeded,
  type AnalyticsFeature,
} from "./analytics";
import { subscribeNetworkRequestMetrics } from "@/src/lib/networkHealth";

const processStartedAt = Date.now();

function featureForPath(path: string): AnalyticsFeature | null {
  if (path === "/" || path.startsWith("/(tabs)")) return "home";
  if (path.startsWith("/garage")) return "garage";
  if (path.includes("/records/fuel")) return "fuel";
  if (path.includes("/records/expenses")) return "expenses";
  if (path.startsWith("/meters")) return "meters";
  if (path.startsWith("/insights")) return "insights";
  if (path.startsWith("/reports")) return "reports";
  if (path.startsWith("/reminders")) return "reminders";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/maintenance")) return "maintenance";
  if (path.startsWith("/owner/members")) return "members";
  if (path.startsWith("/settings")) return "settings";
  return null;
}

export function AnalyticsCoordinator({ ready }: { ready: boolean }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<boolean | null>(null);
  const initialConsent = useRef<boolean | null>(null);
  const startupTracked = useRef(false);
  const lastPath = useRef("");
  const lastFeatureOpened = useRef(new Map<AnalyticsFeature, number>());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAnalyticsConsent(setConsent);
    void getAnalyticsConsent().then((value) => {
      if (!active) return;
      initialConsent.current = value;
      setConsent(value);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (consent !== true) return;
    void trackFirstOpenIfNeeded();
    void trackAppForeground();
    let durations: number[] = [];
    let failures = 0;
    const flush = () => {
      if (!durations.length) return;
      const ordered = [...durations].sort((a, b) => a - b);
      const p95DurationMs =
        ordered[
          Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)
        ];
      trackAnalyticsEvent("api_health", {
        requestCount: durations.length,
        failureCount: failures,
        p95DurationMs,
      });
      durations = [];
      failures = 0;
    };
    const stopMetrics = subscribeNetworkRequestMetrics((sample) => {
      durations.push(sample.durationMs);
      if (!sample.succeeded) failures++;
      if (durations.length >= 20) flush();
    });
    const appState =
      Platform.OS === "web"
        ? undefined
        : AppState.addEventListener("change", (state) => {
            if (state === "active") void trackAppForeground();
            else flush();
          });
    return () => {
      stopMetrics();
      appState?.remove();
      flush();
    };
  }, [consent]);

  useEffect(() => {
    if (consent !== true || !ready || !initialConsent.current) return;
    if (startupTracked.current) return;
    startupTracked.current = true;
    trackAnalyticsEvent("startup_ready", {
      durationMs: Math.min(300_000, Date.now() - processStartedAt),
    });
  }, [consent, ready]);

  useEffect(() => {
    if (consent !== true || !ready || pathname === lastPath.current) return;
    lastPath.current = pathname;
    const feature = featureForPath(pathname);
    if (!feature) return;
    const previousAt = lastFeatureOpened.current.get(feature) ?? 0;
    if (Date.now() - previousAt >= 10 * 60_000) {
      lastFeatureOpened.current.set(feature, Date.now());
      trackAnalyticsEvent("feature_opened", { feature });
    }
    if (pathname.endsWith("/add"))
      trackAnalyticsEvent("form_started", { feature });
  }, [consent, pathname, ready]);

  return null;
}
