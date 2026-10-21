import * as WebBrowser from "expo-web-browser";
import { client } from "@/src/lib/supabase";
import { env } from "@/src/lib/env";
WebBrowser.maybeCompleteAuthSession();
export async function completeOAuth(url: string) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  const failure = parsed.searchParams.get("error_description");
  if (failure) throw new Error(failure);
  if (code) {
    const { error } = await client().auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}
export async function googleSignIn() {
  const { data, error } = await client().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: env?.redirect, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const response = await WebBrowser.openAuthSessionAsync(
    data.url,
    env?.redirect,
  );
  if (response.type === "success") await completeOAuth(response.url);
}
export async function sendOtp(email: string) {
  const { error } = await client().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}
export async function verifyOtp(email: string, token: string) {
  const { error } = await client().auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
}
