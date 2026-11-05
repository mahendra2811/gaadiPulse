export function authDestination(
  authenticated: boolean,
  profileReady: boolean,
  hasDisplayName: boolean,
) {
  return !authenticated
    ? "/auth/login"
    : !profileReady
      ? null
      : hasDisplayName
        ? "/(tabs)"
        : "/onboarding";
}

// A recovery OTP establishes a session before its new password is saved.
// Keep this route mounted rather than redirecting it into the garage.
export function keepsAuthenticatedAuthScreen(pathname: string) {
  return pathname === "/auth/legal" || pathname === "/auth/reset-password";
}

/** Gate first-time setup on every app entry, including deep links and session restore. */
export function profileRedirect(
  pathname: string,
  hasDisplayName: boolean,
): string | null {
  if (keepsAuthenticatedAuthScreen(pathname)) return null;
  if (!hasDisplayName) return pathname === "/onboarding" ? null : "/onboarding";
  return pathname.startsWith("/auth/") || pathname === "/onboarding"
    ? "/(tabs)"
    : null;
}
