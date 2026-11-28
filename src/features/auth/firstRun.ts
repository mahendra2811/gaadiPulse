import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const INTRO_KEY = "gaadipulse-intro-v1";

export async function hasSeenFirstRunIntro() {
  try {
    const value =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(INTRO_KEY)
        : await SecureStore.getItemAsync(INTRO_KEY);
    return value === "seen";
  } catch {
    return false;
  }
}

export async function markFirstRunIntroSeen() {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(INTRO_KEY, "seen");
    } catch {
      // Continue to sign-in if browser storage is unavailable.
    }
    return;
  }
  await SecureStore.setItemAsync(INTRO_KEY, "seen");
}
