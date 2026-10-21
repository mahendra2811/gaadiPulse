import { useEffect, useState } from "react";
import { Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import {
  Screen,
  AppText,
  AppButton,
  InputField,
  ErrorState,
  Card,
} from "@/src/components/ui";
import { artwork } from "@/src/lib/assets";
import { t } from "@/src/lib/i18n";
import { env } from "@/src/lib/env";
import { googleSignIn, sendOtp, verifyOtp } from "./api";
export function Welcome() {
  const [page, setPage] = useState(0);
  const titles = [t("intro1"), t("intro2"), t("intro3")];
  const bodies = [t("introBody1"), t("introBody2"), t("introBody3")];
  return (
    <Screen
      title={t("app")}
      action={
        <AppButton
          label={page === 2 ? t("skip") : t("continue")}
          onPress={() =>
            page < 2 ? setPage(page + 1) : router.push("/auth/login")
          }
        />
      }
    >
      <Image
        source={artwork.onboarding[page]}
        style={{ width: "100%", height: 260, resizeMode: "contain" }}
      />
      <AppText large>{titles[page]}</AppText>
      <AppText muted>{bodies[page]}</AppText>
      <AppText>{`${page + 1} / 3`}</AppText>
      <AppButton
        secondary
        label={t("login")}
        onPress={() => router.push("/auth/login")}
      />
      <AppButton
        secondary
        label={t("legal")}
        onPress={() => router.push("/auth/legal")}
      />
    </Screen>
  );
}
export function Login() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t("login")} loading={busy}>
      {!env ? (
        <Card>
          <AppText large>{t("configTitle")}</AppText>
          <AppText>{t("configBody")}</AppText>
        </Card>
      ) : (
        <>
          <AppButton
            label={t("google")}
            disabled={busy}
            onPress={() => void run(googleSignIn)}
          />
          <InputField
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AppButton
            label={t("send")}
            disabled={busy || !z.email().safeParse(email.trim()).success}
            onPress={() =>
              void run(async () => {
                await sendOtp(email.trim());
                router.push({
                  pathname: "/auth/verify",
                  params: { email: email.trim() },
                });
              })
            }
          />
        </>
      )}
      {!!error && <ErrorState message={error} retry={() => setError("")} />}
      <AppButton secondary label={t("back")} onPress={() => router.back()} />
    </Screen>
  );
}
export function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [until, setUntil] = useState(() => Date.now() + 60000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t("verify")} loading={busy}>
      <AppText>{email}</AppText>
      <InputField
        label={t("code")}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
      />
      <AppButton
        label={t("verify")}
        disabled={busy || code.length < 6}
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
    </Screen>
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
