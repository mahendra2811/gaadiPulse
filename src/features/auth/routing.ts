export function authDestination(
  authenticated: boolean,
  profileReady: boolean,
  hasDisplayName: boolean,
) {
  return !authenticated
    ? "/auth/welcome"
    : !profileReady
      ? null
      : hasDisplayName
        ? "/(tabs)"
        : "/settings/profile";
}

// A recovery OTP establishes a session before its new password is saved.
// Keep this route mounted rather than redirecting it into the garage.
export function keepsAuthenticatedAuthScreen(pathname: string) {
  return pathname === "/auth/legal" || pathname === "/auth/reset-password";
}
