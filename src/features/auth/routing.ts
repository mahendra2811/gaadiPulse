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
