import { errorMessage } from "@/src/lib/errors";
import { PasswordScreen } from "./PasswordScreen";
import { useEffect, useRef, useState } from "react";

import { Redirect, router, useLocalSearchParams } from "expo-router";
import { accountEmail, emailCode } from "./passwordSchema";
import {
  Screen,
  AppText,
  AppButton,
  InputField,
  ErrorState,
} from "@/src/components/ui";

import { t } from "@/src/lib/i18n";
import { AuthLayout } from "./AuthLayout";

import { sendOtp, verifyOtp } from "./api";
export function Welcome() {
  return <Redirect href="/auth/login" />;
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
        onPress={() => router.back()}
      />
      {!!error && <ErrorState message={error} retry={() => setError("")} />}
    </AuthLayout>
  );
}
export function Legal() {
  return (
    <Screen title={t("legal")}>
      <AppText>{t("privacy")}</AppText>
      <AppText>{t("terms")}</AppText>
      <AppButton label={t("back")} onPress={() => router.back()} />
    </Screen>
  );
}
