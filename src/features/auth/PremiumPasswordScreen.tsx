import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { ZodError } from "zod";
import { AppButton, AppText, InputField } from "@/src/components/ui";
import { FormError } from "@/src/components/ui/FormError";
import { t } from "@/src/lib/i18n";
import { useTheme } from "@/src/lib/theme";
import { env } from "@/src/lib/env";
import { AuthLink } from "./AuthLayout";
import {
  PremiumAuthLayout,
  AuthTextField,
  AuthPrimaryButton,
  GoogleAuthButton,
  AuthConsent,
} from "./PremiumAuth";
import { googleSignIn } from "./api";
import { accountEmail, emailCode, passwordPair, signupName } from "./passwordSchema";
import { passwordLogin, passwordSignup, resendSignup, verifyAccountCode } from "./passwordApi";
export function PremiumPasswordScreen({ mode }: { mode: "login" | "signup" }) {
  const c = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<"details" | "verify">("details");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (stage !== "verify") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stage]);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ZodError ? e.issues[0].message : e instanceof Error ? e.message : String(e)
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const markSent = () => {
    setRetryAt(Date.now() + 60000);
    setNow(Date.now());
    setCode("");
    setStage("verify");
  };
  const submit = async () => {
    if (stage === "verify") {
      await verifyAccountCode(email, code, "signup");
      setCode("");
      return;
    }
    accountEmail.parse(email);
    if (mode === "login") {
      await passwordLogin(email, password);
      setPassword("");
      return;
    }
    if (!consent) throw new Error(t("authAgreeRequired"));
    const cleanName = signupName.parse(name);
    passwordPair.parse({ password, confirm });
    const signedIn = await passwordSignup(email, password, cleanName);
    setPassword("");
    setConfirm("");
    if (!signedIn) markSent();
  };
  const disabled = busy || !env;
  return (
    <PremiumAuthLayout
      title={
        stage === "verify"
          ? t("authCheckEmail")
          : mode === "login"
            ? t("authLoginTitle")
            : t("createAccount")
      }
      subtitle={
        stage === "verify"
          ? t("authVerifyStep")
          : t(mode === "login" ? "authPremiumLoginHint" : "authPremiumSignupHint")
      }
      loading={busy}
    >
      {!env && <AppText>{t("configBody")}</AppText>}
      {stage === "details" ? (
        <>
          <GoogleAuthButton
            disabled={disabled || (mode === "signup" && !consent)}
            onPress={() => void run(googleSignIn)}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            <Text style={{ color: c.muted, fontSize: 12 }}>
              {t(mode === "login" ? "authOrSignIn" : "authOrSignUp")}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
          </View>
          {mode === "signup" && (
            <AuthTextField
              label={t("authFullName")}
              icon="person-outline"
              placeholder={t("authNamePlaceholder")}
              value={name}
              onChangeText={setName}
              maxLength={120}
              autoCapitalize="words"
              autoComplete="name"
              editable={!busy}
            />
          )}
          <AuthTextField
            label={t("email")}
            icon="mail-outline"
            placeholder={t("authEmailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            maxLength={254}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          <AuthTextField
            label={t("password")}
            icon="lock-closed-outline"
            placeholder={t("authPasswordPlaceholder")}
            secret
            value={password}
            onChangeText={setPassword}
            maxLength={128}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            editable={!busy}
          />
          {mode === "signup" && (
            <>
              
              <AuthTextField
                label={t("confirmPassword")}
                icon="shield-checkmark-outline"
                secret
                value={confirm}
                onChangeText={setConfirm}
                maxLength={128}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={!busy}
              />
            </>
          )}
          {mode === "signup" && (
            <AuthConsent checked={consent} onChange={() => setConsent(!consent)} disabled={busy} />
          )}
          {!!error && <FormError message={error} onDismiss={() => setError("")} />}
          <AuthPrimaryButton
            label={t(mode === "login" ? "login" : "createAccount")}
            disabled={disabled || (mode === "signup" && !consent)}
            loading={busy}
            onPress={() => void run(submit)}
          />
          {mode === "login" && (
            <AuthLink
              label={t("forgotPassword")}
              disabled={busy}
              onPress={() => router.push("/auth/reset-password")}
            />
          )}
          <AuthLink
            label={t(mode === "login" ? "authNeedAccount" : "authHaveAccount")}
            disabled={busy}
            onPress={() => router.replace(mode === "login" ? "/auth/signup" : "/auth/login")}
          />
        </>
      ) : (
        <>
          <AppText>{t("signupSent")}</AppText>
          <AppText muted>{email}</AppText>
          <InputField
            label={t("code")}
            required
            value={code}
            onChangeText={setCode}
            editable={!busy}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
          />
          {!!error && <FormError message={error} onDismiss={() => setError("")} />}
          <AuthPrimaryButton
            label={t("signupVerify")}
            disabled={disabled || !emailCode.safeParse(code.trim()).success}
            loading={busy}
            onPress={() => void run(submit)}
          />
          <AppButton
            secondary
            label={`${t("resendAvailable")}${retryAt > now ? ` (${Math.ceil((retryAt - now) / 1000)})` : ""}`}
            disabled={busy || retryAt > now}
            onPress={() =>
              void run(async () => {
                await resendSignup(email);
                markSent();
              })
            }
          />
          <AuthLink
            label={t("changeEmail")}
            disabled={busy}
            onPress={() => {
              setStage("details");
              setCode("");
              setError("");
            }}
          />
        </>
      )}
    </PremiumAuthLayout>
  );
}
