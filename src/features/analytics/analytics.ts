import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { env } from "@/src/lib/env";
import { getLocale } from "@/src/lib/i18n";
import { onlineFetch } from "@/src/lib/onlineFetch";

const CONSENT_KEY = "gaadipulse.analytics.consent.v1";
const INSTALLATION_KEY = "gaadipulse.analytics.installation.v1";
const consentListeners = new Set<(enabled: boolean) => void>();
let enabled: boolean | null = null;
let enabledRead: Promise<boolean> | null = null;

export type AnalyticsFeature =
  | "home"
  | "garage"
  | "fuel"
  | "expenses"
  | "meters"
  | "insights"
  | "reports"
  | "reminders"
  | "notifications"
  | "settings"
  | "maintenance"
  | "members";
export type AnalyticsEventName =
  | "first_open"
  | "onboarding_started"
  | "onboarding_completed"
  | "vehicle_created"
  | "fuel_created"
  | "expense_created"
  | "feature_opened"
  | "grant_resolved"
  | "app_foreground"
  | "form_started"
  | "form_completed"
  | "startup_ready"
  | "api_health";

type AnalyticsAttributes = {
  feature?: AnalyticsFeature;
  role?: "OWNER" | "PILOT";
  durationMs?: number;
  requestCount?: number;
  failureCount?: number;
  p95DurationMs?: number;
};

async function readValue(key: string) {
  try {
    return Platform.OS === "web"
      ? (globalThis.localStorage?.getItem(key) ?? null)
      : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeValue(key: string, value: string | null) {
  if (Platform.OS === "web") {
    if (typeof globalThis.localStorage === "undefined") return;
    if (value === null) globalThis.localStorage.removeItem(key);
    else globalThis.localStorage.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

export function subscribeAnalyticsConsent(listener: (value: boolean) => void) {
  consentListeners.add(listener);
  return () => consentListeners.delete(listener);
}

function publishConsent(value: boolean) {
  enabled = value;
  for (const listener of consentListeners) listener(value);
}

export async function getAnalyticsConsent() {
  if (enabled !== null) return enabled;
  if (!enabledRead) {
    enabledRead = readValue(CONSENT_KEY)
      .then((value) => {
        enabled = value === "enabled";
        return enabled;
      })
      .finally(() => {
        enabledRead = null;
      });
  }
  return enabledRead;
}

async function getInstallationId() {
  const existing = await readValue(INSTALLATION_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await writeValue(INSTALLATION_KEY, created);
  return created;
}

async function send(payload: Record<string, unknown>) {
  if (!env) return;
  const response = await onlineFetch(
    `${env.url.replace(/\/$/, "")}/functions/v1/collect-analytics`,
    {
      method: "POST",
      headers: {
        apikey: env.key,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(`ANALYTICS_HTTP_${response.status}`);
}

async function sendEvent(
  eventName: AnalyticsEventName,
  attributes: AnalyticsAttributes = {},
  eventId?: string,
) {
  if (!(await getAnalyticsConsent())) return;
  try {
    const installationId = await getInstallationId();
    const locale = getLocale();
    await send({
      action: "track",
      event: {
        eventId: eventId ?? Crypto.randomUUID(),
        installationId,
        name: eventName,
        appVersion: Constants.expoConfig?.version ?? "0.0.0",
        platform: Platform.OS,
        locale: locale === "en-IN" || locale === "hi-IN" ? locale : "other",
        ...attributes,
      },
    });
  } catch {
    // Analytics is optional and never changes the result or latency of a user action.
  }
}

export async function enableAnalytics() {
  const installationId = Crypto.randomUUID();
  await writeValue(CONSENT_KEY, "enabled");
  publishConsent(true);
  try {
    await writeValue(INSTALLATION_KEY, installationId);
  } catch (error) {
    await writeValue(CONSENT_KEY, "disabled").catch(() => undefined);
    publishConsent(false);
    throw error;
  }
  // This is the first observed open after consent, not app-store install attribution.
  await sendEvent("first_open", {}, installationId);
}

export async function disableAnalytics() {
  const installationId = await readValue(INSTALLATION_KEY);
  await writeValue(CONSENT_KEY, "disabled");
  publishConsent(false);
  try {
    if (installationId && env) await send({ action: "revoke", installationId });
  } finally {
    await writeValue(INSTALLATION_KEY, null);
  }
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  attributes: AnalyticsAttributes = {},
) {
  void sendEvent(eventName, attributes);
}

export async function trackFirstOpenIfNeeded() {
  if (!(await getAnalyticsConsent())) return;
  const installationId = await getInstallationId();
  await sendEvent("first_open", {}, installationId);
}

export async function trackAppForeground() {
  if (await getAnalyticsConsent()) await sendEvent("app_foreground");
}
