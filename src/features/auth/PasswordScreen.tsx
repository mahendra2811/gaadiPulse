import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { ZodError } from "zod";
import { AppButton, AppText, InputField } from "@/src/components/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { t } from "@/src/lib/i18n";
import { FormError } from "@/src/components/ui/FormError";
import { PasswordField } from "./PasswordField";
import { AuthLayout, AuthDivider, AuthLink } from "./AuthLayout";
import { PremiumPasswordScreen } from "./PremiumPasswordScreen";
import { googleSignIn, sendOtp } from "./api";
import { env } from "@/src/lib/env";
import { useSession } from "./session";
import { useProfile } from "./profile";
import { useTheme } from "@/src/lib/theme";
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
  return mode === "recovery" ? (
    <RecoveryScreen />
  ) : (
    <PremiumPasswordScreen mode={mode} />
  );
}
function RecoveryScreen() {
  const mode: Mode = "recovery";
  return <LegacyPasswordScreen mode={mode} />;
}
function LegacyPasswordScreen({ mode }: { mode: Mode }) {
  const colors = useTheme();
  const auth = useSession();
  const profile = useProfile();
  const [email, setEmail] = useState(
    mode === "recovery" ? (auth.session?.user.email ?? "") : "",
  );
  const [useCode, setUseCode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
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
    if (mode === "login" && useCode) {
      await sendOtp(email.trim());
      router.push({
        pathname: "/auth/verify",
        params: { email: email.trim() },
      });
    } else if (mode === "login") {
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
    stage === "password" ||
    (stage === "details" && mode !== "recovery" && !useCode);
  return (
    <AuthLayout
      title={mode === "login" ? t("authLoginTitle") : title}
      subtitle={
        mode === "login"
          ? t("authLoginHint")
          : mode === "signup"
            ? t(stage === "verify" ? "authVerifyStep" : "authSignupHint")
            : t("authRecoveryHint")
      }
      loading={busy}
      onBack={
        mode !== "login" ? () => router.replace("/auth/login") : undefined
      }
    >
      {!env && <AppText>{t("configBody")}</AppText>}
      {mode !== "recovery" && stage === "details" && (
        <>
          <AppButton
            secondary
            label={t("google")}
            disabled={busy || !env}
            onPress={() => void run(googleSignIn)}
          />
          <AuthDivider />
        </>
      )}
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
              required
              maxLength={254}
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
              {mode === "recovery" ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Ionicons
                      name="mail-open-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      {t("email")}
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: colors.ink,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {email}
                    </Text>
                  </View>
                </View>
              ) : (
                <AppText>{t("signupSent")}</AppText>
              )}
              {mode === "recovery" && <AppText muted>{t("resetSent")}</AppText>}
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
            </>
          )}
          {editingPassword && (
            <>
              <PasswordField
                label={t(stage === "password" ? "newPassword" : "password")}
                required
                maxLength={128}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              {(mode === "signup" || stage === "password") && (
                <>
                  <PasswordField
                    label={t("confirmPassword")}
                    required
                    maxLength={128}
                    value={confirm}
                    onChangeText={setConfirm}
                    editable={!busy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                  />
                </>
              )}
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
                    : mode === "login"
                      ? t(useCode ? "send" : "authEmailLogin")
                      : title
            }
            disabled={
              busy ||
              !env ||
              (stage === "verify"
                ? !emailCode.safeParse(code.trim()).success
                : stage === "details"
                  ? !accountEmail.safeParse(email.trim()).success ||
                    (mode === "login" && !useCode && !password)
                  : false)
            }
            onPress={() => void run(submit)}
          />
          {stage === "verify" && mode === "recovery" && (
            <View style={{ gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || retryAt > now }}
                disabled={busy || retryAt > now}
                onPress={() =>
                  void run(async () => {
                    await requestPasswordReset(email);
                    sent();
                  })
                }
                style={({ pressed }) => ({
                  minHeight: 58,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.background,
                  opacity: busy || retryAt > now ? 0.55 : pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name="refresh-outline"
                  size={21}
                  color={colors.primary}
                />
                <Text
                  style={{
                    flex: 1,
                    color: colors.ink,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {t("resendAvailable")}
                </Text>
                {retryAt > now && (
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 14,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {Math.ceil((retryAt - now) / 1000)}s
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => {
                  setStage("details");
                  setCode("");
                  setError("");
                }}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  opacity: busy ? 0.45 : pressed ? 0.65 : 1,
                })}
              >
                <Ionicons
                  name="create-outline"
                  size={19}
                  color={colors.muted}
                />
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {t("changeEmail")}
                </Text>
              </Pressable>
            </View>
          )}
          {stage === "verify" && mode === "signup" && (
            <>
              <AppButton
                secondary
                label={`${t("resendAvailable")}${retryAt > now ? ` (${Math.ceil((retryAt - now) / 1000)})` : ""}`}
                disabled={busy || retryAt > now}
                onPress={() =>
                  void run(async () => {
                    await resendSignup(email);
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
              <AuthLink
                label={t(useCode ? "authUsePassword" : "authUseCode")}
                disabled={busy}
                onPress={() => {
                  setUseCode(!useCode);
                  setError("");
                }}
              />
              <AuthLink
                label={t("forgotPassword")}
                disabled={busy}
                onPress={() => router.push("/auth/reset-password")}
              />
              <AuthLink
                label={t("authNeedAccount")}
                disabled={busy}
                onPress={() => router.replace("/auth/signup")}
              />
            </>
          )}
          {mode === "signup" && (
            <AuthLink
              label={t("authHaveAccount")}
              disabled={busy}
              onPress={() => router.replace("/auth/login")}
            />
          )}
        </>
      )}
      {!!error && <FormError message={error} onDismiss={() => setError("")} />}
    </AuthLayout>
  );
}
