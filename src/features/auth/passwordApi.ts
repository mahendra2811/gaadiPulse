import { t } from "../../lib/i18n";
import { client } from "../../lib/supabase";
import {
  accountEmail,
  emailCode,
  newPassword,
  signupName,
} from "./passwordSchema";

export async function passwordLogin(email: string, password: string) {
  if (!password || password.length > 128) throw new Error(t("passwordRules"));
  const { error } = await client().auth.signInWithPassword({
    email: accountEmail.parse(email.trim()),
    password,
  });
  if (error) throw error;
}
export async function passwordSignup(
  email: string,
  password: string,
  name?: string,
) {
  const { data, error } = await client().auth.signUp({
    email: accountEmail.parse(email.trim()),
    password: newPassword.parse(password),
    ...(name !== undefined
      ? { options: { data: { full_name: signupName.parse(name) } } }
      : {}),
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
