import { Stack, usePathname } from "expo-router";
import { AuthShell } from "@/src/features/auth/PremiumAuth";

const brandedPaths = new Set([
  "/auth/login",
  "/auth/password",
  "/auth/signup",
  "/auth/reset-password",
  "/auth/verify",
]);

export default function AuthNavigator() {
  const pathname = usePathname();
  const navigator = (
    <Stack screenOptions={{ headerShown: false, animation: "none" }} />
  );
  return brandedPaths.has(pathname) ? (
    <AuthShell>{navigator}</AuthShell>
  ) : (
    navigator
  );
}
