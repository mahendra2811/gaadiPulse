import { useRef, useState } from "react";
import { router } from "expo-router";
import { ZodError } from "zod";
import { AppText, useToast } from "@/src/components/ui";
import { FormError } from "@/src/components/ui/FormError";
import { t } from "@/src/lib/i18n";
import {
  PremiumAuthLayout,
  AuthTextField,
  AuthPrimaryButton,
} from "./PremiumAuth";
import { AuthLink } from "./AuthLayout";
import {
  passwordLogin,
  setNewPassword as setAccountPassword,
} from "./passwordApi";
import { passwordPair } from "./passwordSchema";
import { useSession } from "./session";

export function ChangePassword() {
  const auth = useSession();
  const toast = useToast();
  const email = auth.session?.user.email ?? "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, updateNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const submit = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      if (!email) throw new Error(t("emailRequired"));
      if (!currentPassword) throw new Error(t("currentPasswordRequired"));
      passwordPair.parse({ password: newPassword, confirm: confirmPassword });
      await passwordLogin(email, currentPassword);
      await setAccountPassword(newPassword);
      setCurrentPassword("");
      updateNewPassword("");
      setConfirmPassword("");
      toast(t("passwordChangeSuccess"), "success");
      router.back();
    } catch (cause) {
      setError(
        cause instanceof ZodError
          ? cause.issues[0].message
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return (
    <PremiumAuthLayout
      title={t("changePassword")}
      subtitle={t("changePasswordHint")}
      loading={busy}
      onBack={() => router.back()}
    >
      {email ? (
        <>
          <AppText muted>{email}</AppText>
          <AuthTextField
            label={t("currentPassword")}
            icon="lock-closed-outline"
            secret
            value={currentPassword}
            onChangeText={setCurrentPassword}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <AuthTextField
            label={t("newPassword")}
            icon="key-outline"
            secret
            value={newPassword}
            onChangeText={updateNewPassword}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <AuthTextField
            label={t("confirmNewPassword")}
            icon="shield-checkmark-outline"
            secret
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          {!!error && (
            <FormError message={error} onDismiss={() => setError("")} />
          )}
          <AuthPrimaryButton
            label={t("changePassword")}
            disabled={busy}
            loading={busy}
            onPress={() => void submit()}
          />
          <AppText muted>{t("forgotPasswordHelp")}</AppText>
          <AuthLink
            label={t("forgotPassword")}
            disabled={busy}
            onPress={() => router.push("/auth/reset-password")}
          />
        </>
      ) : (
        <>
          <AppText>{t("emailRequired")}</AppText>
          <AuthLink
            label={t("forgotPassword")}
            disabled={busy}
            onPress={() => router.push("/auth/reset-password")}
          />
        </>
      )}
    </PremiumAuthLayout>
  );
}
