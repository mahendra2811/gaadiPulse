import type { Href } from "expo-router";

// Fallbacks are used only for direct links without in-app history.
// Normal Back always follows the actual stack, preserving the originating tab.
export function pageNavigation(path: string): {
  back: boolean;
  fallback: Href;
  section?:
    | "garage"
    | "fuel"
    | "expenses"
    | "meters"
    | "progress"
    | "documents"
    | "reminders"
    | "settings"
    | "more";
} {
  const parts = path.split("/").filter(Boolean);
  const [root, kind, action] = parts;
  if (!root || ["fuel", "expenses", "more"].includes(root))
    return { back: false, fallback: "/(tabs)" };
  if (root === "auth")
    return {
      back: ["login", "verify", "legal"].includes(kind),
      fallback: kind === "verify" ? "/auth/login" : "/auth/welcome",
    };
  if (root === "garage")
    return {
      back: true,
      fallback: kind ? "/garage" : "/(tabs)/more",
      section: kind ? "garage" : "more",
    };
  if (
    root === "records" &&
    [
      "fuel",
      "expenses",
      "meters",
      "progress",
      "documents",
      "reminders",
    ].includes(kind)
  ) {
    const section = kind as
      "fuel" | "expenses" | "meters" | "progress" | "documents" | "reminders";
    return {
      back: true,
      fallback: action
        ? kind === "meters"
          ? "/meters/history"
          : { pathname: "/records/[kind]", params: { kind } }
        : "/(tabs)/more",
      section: action ? section : "more",
    };
  }
  if (root === "settings")
    return {
      back: true,
      fallback: kind ? "/settings" : "/(tabs)/more",
      section: kind ? "settings" : "more",
    };
  return { back: true, fallback: "/(tabs)/more", section: "more" };
}
