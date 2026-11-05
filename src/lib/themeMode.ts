export type ThemeMode = "light" | "dark" | "system";

export function resolveTheme(
  mode: ThemeMode,
  system: "light" | "dark" | null | undefined,
): "light" | "dark" {
  return mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
}
