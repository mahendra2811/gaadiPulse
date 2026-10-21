import { t } from "@/src/lib/i18n";
import { client } from "@/src/lib/supabase";
import { accountEmail, emailCode, newPassword } from "./passwordSchema";

export async function passwordLogin(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({
    email: accountEmail.parse(email.trim()),
    password,
  });
  if (error) throw error;
}
export async function passwordSignup(email: string, password: string) {
  const { data, error } = await client().auth.signUp({
    email: accountEmail.parse(email.trim()),
    password: newPassword.parse(password),
  });
  if (error) throw error;
  return !!data.session;
}
export async function resendSignup(email: string) {
  const { error } = await client().auth.resend({
    type: "signup",
    email: accountEmail.parse(email.trim()),
  });
  if (error) throw error;
}
export async function requestPasswordReset(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(
    accountEmail.parse(email.trim()),
  );
  if (error) throw error;
}
export async function verifyAccountCode(
  email: string,
  code: string,
  type: "signup" | "recovery",
) {
  const { data, error } = await client().auth.verifyOtp({
    email: accountEmail.parse(email.trim()),
    token: emailCode.parse(code.trim()),
    type,
  });
  if (error) throw error;
  if (!data.session) throw new Error(t("codeSessionMissing"));
}
export async function setNewPassword(password: string) {
  const { error } = await client().auth.updateUser({
    password: newPassword.parse(password),
  });
  if (error) throw error;
}
