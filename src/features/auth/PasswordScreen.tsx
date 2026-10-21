import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { ZodError } from "zod";
import {
  AppButton,
  AppText,
  ErrorState,
  InputField,
  Screen,
} from "@/src/components/ui";
import { t } from "@/src/lib/i18n";
import { useSession } from "./session";
import { useProfile } from "./profile";
import { accountEmail, emailCode, passwordPair } from "./passwordSchema";
import {
  passwordLogin,
  passwordSignup,
  requestPasswordReset,
  resendSignup,
  setNewPassword,
  verifyAccountCode,
} from "./passwordApi";

type Mode = "login" | "signup" | "recovery";
export function PasswordScreen({ mode }: { mode: Mode }) {
  const auth = useSession();
  const profile = useProfile();
  const [email, setEmail] = useState(
    mode === "recovery" ? (auth.session?.user.email ?? "") : "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<
    "details" | "verify" | "password" | "complete"
  >("details");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ZodError
          ? e.issues[0].message
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const sent = () => {
    setRetryAt(Date.now() + 60000);
    setNow(Date.now());
    setCode("");
    setStage("verify");
  };
  const submit = async () => {
    if (stage === "verify") {
      await verifyAccountCode(
        email,
        code,
        mode === "recovery" ? "recovery" : "signup",
      );
      setCode("");
      if (mode === "recovery") setStage("password");
      return;
    }
    if (stage === "password") {
      passwordPair.parse({ password, confirm });
      await setNewPassword(password);
      setPassword("");
      setConfirm("");
      setStage("complete");
      return;
    }
    accountEmail.parse(email.trim());
    if (mode === "login") {
      await passwordLogin(email, password);
      setPassword("");
    } else if (mode === "signup") {
      passwordPair.parse({ password, confirm });
      const signedIn = await passwordSignup(email, password);
      setPassword("");
      setConfirm("");
      if (!signedIn) sent();
    } else {
      await requestPasswordReset(email);
      sent();
    }
  };
  const title =
    mode === "login"
      ? t("passwordLogin")
      : mode === "signup"
        ? t("createAccount")
        : t("resetPassword");
  const editingPassword =
    stage === "password" || (stage === "details" && mode !== "recovery");
  return (
    <Screen title={title} loading={busy}>
      {stage === "complete" ? (
        <>
          <AppText>{t("passwordUpdated")}</AppText>
          <AppButton
            label={t("continue")}
            onPress={() =>
              router.replace(
                profile.data?.display_name ? "/(tabs)" : "/settings/profile",
              )
            }
          />
        </>
      ) : (
        <>
          {stage === "details" ? (
            <InputField
              label={t("email")}
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          ) : (
            <AppText>{email}</AppText>
          )}
          {mode === "signup" && stage === "details" && (
            <AppText muted>{t("accountNameHelp")}</AppText>
          )}
          {stage === "verify" && (
            <>
              <AppText>
                {t(mode === "recovery" ? "resetSent" : "signupSent")}
              </AppText>
              <InputField
                label={t("code")}
                value={code}
                onChangeText={setCode}
                editable={!busy}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
              />
            </>
          )}
          {editingPassword && (
            <>
              <InputField
                label={t(stage === "password" ? "newPassword" : "password")}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              {(mode === "signup" || stage === "password") && (
                <>
                  <AppText muted>{t("passwordRules")}</AppText>
                  <InputField
                    label={t("confirmPassword")}
                    value={confirm}
                    onChangeText={setConfirm}
                    editable={!busy}
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                  />
                </>
              )}
              <AppButton
                secondary
                label={t(visible ? "hidePassword" : "showPassword")}
                onPress={() => setVisible(!visible)}
              />
            </>
          )}
          <AppButton
            label={
              stage === "verify"
                ? t(mode === "recovery" ? "recoveryVerify" : "signupVerify")
                : stage === "password"
                  ? t("save")
                  : mode === "recovery"
                    ? t("sendReset")
                    : title
            }
            disabled={
              busy ||
              (stage === "verify"
                ? !emailCode.safeParse(code.trim()).success
                : stage === "details"
                  ? !accountEmail.safeParse(email.trim()).success ||
                    (mode === "login" && !password)
                  : false)
            }
            onPress={() => void run(submit)}
          />
          {stage === "verify" && (
            <>
              <AppButton
                secondary
                label={`${t("resendAvailable")}${retryAt > now ? ` (${Math.ceil((retryAt - now) / 1000)})` : ""}`}
                disabled={busy || retryAt > now}
                onPress={() =>
                  void run(async () => {
                    if (mode === "recovery") await requestPasswordReset(email);
                    else await resendSignup(email);
                    sent();
                  })
                }
              />
              <AppButton
                secondary
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
          {mode === "login" && (
            <>
              <AppButton
                secondary
                label={t("createAccount")}
                disabled={busy}
                onPress={() => router.push("/auth/signup")}
              />
              <AppButton
                secondary
                label={t("forgotPassword")}
                disabled={busy}
                onPress={() => router.push("/auth/reset-password")}
              />
              <AppButton
                secondary
                label={t("useOtp")}
                disabled={busy}
                onPress={() => router.replace("/auth/login")}
              />
              <AppText muted>{t("forgotEmailHelp")}</AppText>
            </>
          )}
        </>
      )}
      {!!error && <ErrorState message={error} retry={() => void run(submit)} />}
    </Screen>
  );
}
