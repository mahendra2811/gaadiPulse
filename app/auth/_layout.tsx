import { Stack, usePathname } from "expo-router";
import { AuthShell } from "@/src/features/auth/PremiumAuth";
import { useTheme } from "@/src/lib/theme";

const brandedPaths = new Set([
  "/auth/login",
  "/auth/password",
  "/auth/signup",
  "/auth/reset-password",
  "/auth/verify",
]);

export default function AuthNavigator() {
  const pathname = usePathname();
  const colors = useTheme();
  const navigator = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
  return brandedPaths.has(pathname) ? (
    <AuthShell>{navigator}</AuthShell>
  ) : (
    navigator
  );
}
