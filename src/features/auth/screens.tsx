import { errorMessage } from "@/src/lib/errors";
import { PasswordScreen } from "./PasswordScreen";
import { useEffect, useRef, useState } from "react";

import { Redirect, router, useLocalSearchParams } from "expo-router";
import { accountEmail, emailCode } from "./passwordSchema";
import {
  Screen,
  Card,
  AppText,
  AppButton,
  InputField,
} from "@/src/components/ui";

import { t } from "@/src/lib/i18n";
import { AuthLayout } from "./AuthLayout";
import { FormError } from "@/src/components/ui/FormError";

import { sendOtp, verifyOtp } from "./api";
import { useSession } from "./session";
import { markFirstRunIntroSeen } from "./firstRun";
export function Welcome() {
  const auth = useSession();
  const [busy, setBusy] = useState(false);
  if (auth.session || auth.development) return <Redirect href="/(tabs)" />;
  const continueTo = (path: "/auth/login" | "/auth/signup") => {
    if (busy) return;
    setBusy(true);
    void markFirstRunIntroSeen()
      .catch(() => undefined)
      .finally(() => router.replace(path));
  };
  return (
    <Screen title={t("welcome")} compact>
      <AppText large>{t("intro1")}</AppText>
      <AppText muted>{t("introBody1")}</AppText>
      <Card>
        <AppText large>{t("owner")}</AppText>
        <AppText>{t("introRoleOwner")}</AppText>
        <AppText large>{t("pilot")}</AppText>
        <AppText>{t("introRolePilot")}</AppText>
      </Card>
      <AppText>{t("introFirstVehicle")}</AppText>
      <AppText muted>{t("introBody3")}</AppText>
      <AppButton
        label={t("createAccount")}
        disabled={busy}
        onPress={() => continueTo("/auth/signup")}
      />
      <AppButton
        secondary
        label={t("login")}
        disabled={busy}
        onPress={() => continueTo("/auth/login")}
      />
      <AppButton
        secondary
        label={t("introSkip")}
        disabled={busy}
        onPress={() => continueTo("/auth/login")}
      />
    </Screen>
  );
}
export function Login() {
  return <PasswordScreen mode="login" />;
}
export function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState("");
  const [until, setUntil] = useState(() => Date.now() + 60000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const run = async (fn: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      title={t("verify")}
      subtitle={t("authVerifyHint")}
      loading={busy}
    >
      <AppText>{email}</AppText>
      <InputField
        label={t("code")}
        required
        maxLength={8}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
      />
      <AppButton
        label={t("verify")}
        disabled={
          busy ||
          !emailCode.safeParse(code).success ||
          !accountEmail.safeParse(email ?? "").success
        }
        onPress={() => void run(() => verifyOtp(email, code))}
      />
      <AppButton
        secondary
        label={`${t("resend")}${until > now ? ` (${Math.ceil((until - now) / 1000)})` : ""}`}
        disabled={busy || until > now}
        onPress={() =>
          void run(async () => {
            await sendOtp(email);
            setUntil(Date.now() + 60000);
          })
        }
      />
      <AppButton
        secondary
        label={t("changeEmail")}
        onPress={() => router.replace("/auth/login")}
      />
      {!!error && <FormError message={error} onDismiss={() => setError("")} />}
    </AuthLayout>
  );
}
export function Legal() {
  const auth = useSession();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(auth.session ? "/settings/security" : "/auth/login");
  };
  return (
    <Screen title={t("account.legal")} compact>
      <AppText muted>
        Pre-release information. The app operator must review and publish the
        final policy and terms before distribution.
      </AppText>
      <Card>
        <AppText large>{t("authPrivacyTitle")}</AppText>
        <AppText>
          GaadiPulse uses your account details and the vehicle information you
          enter, such as fuel, expenses, readings, members, reminders and
          document details. The configured Supabase project stores account and
          shared vehicle records. Owners control per-vehicle access, subject to
          server permissions.
        </AppText>
        <AppText>
          Records require an internet connection. Open forms are held in memory;
          durable offline record drafts and caches are not provided. The app
          schedules optional local reminders on this device. It does not provide
          GPS tracking or ads.
        </AppText>
        <AppText>
          Reports you export or share create copies outside the app. Other
          people who receive them may retain them. Signing out clears the
          session and scheduled local notifications on this device, but does not
          delete server records or exported files.
        </AppText>
        <AppText>{t("analyticsLegal")}</AppText>
        <AppText>
          To request account deletion, open Settings → Security → Request
          account deletion, or contact mahendrapuniya92@gmail.com. Requests
          revoke vehicle access and require operator review. Retention and
          completion depend on the operator’s process; do not assume that
          submission immediately deletes records.
        </AppText>
      </Card>
      <Card>
        <AppText large>{t("authTermsTitle")}</AppText>
        <AppText>
          Enter accurate information, use truthful observation times, and grant
          access only to trusted people. App Owner or Pilot roles do not
          establish legal vehicle ownership. Each user is responsible for
          reviewing records, permissions and exports.
        </AppText>
        <AppText>
          Document entries are metadata, not official RC or licence documents.
          Insights depend on available readings and valid intervals, and
          reminders and notifications can be delayed or missed. Keep independent
          records and use official sources where required.
        </AppText>
        <AppText>
          Features, access and availability depend on the configured service and
          network. The operator should review these pre-release terms, privacy,
          retention and support arrangements before public distribution.
        </AppText>
      </Card>
      <AppButton secondary label={t("back")} onPress={goBack} />
    </Screen>
  );
}
