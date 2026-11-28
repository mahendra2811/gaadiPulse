import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.pooniya.gaadipulse";
export const PLAY_REVIEW_URL = `${PLAY_STORE_URL}&showAllReviews=true`;
export type PlayUpdateCheck = "unavailable" | "current" | "available";

export async function checkPlayUpdate(): Promise<PlayUpdateCheck> {
  if (Platform.OS !== "android" || __DEV__) return "unavailable";
  const { default: SpInAppUpdates } =
    await import("sp-react-native-in-app-updates");
  const updates = new SpInAppUpdates(false);
  const result = await updates.checkNeedsUpdate({
    curVersion: Constants.expoConfig?.version ?? "0.0.0",
  });
  return result.shouldUpdate ? "available" : "current";
}

export async function openPlayStore(url = PLAY_STORE_URL) {
  const marketUrl = `market://details?id=com.pooniya.gaadipulse${
    url === PLAY_REVIEW_URL ? "&showAllReviews=true" : ""
  }`;
  try {
    await Linking.openURL(Platform.OS === "android" ? marketUrl : url);
  } catch {
    // HTTPS opens Google Play when installed and the web listing otherwise.
    await Linking.openURL(url);
  }
}

export async function checkAndStartPlayUpdate() {
  if (Platform.OS !== "android" || __DEV__) {
    await openPlayStore();
    return "store" as const;
  }

  const result = await checkPlayUpdate();
  if (result === "current") return result;
  await openPlayStore();
  return "store" as const;
}
