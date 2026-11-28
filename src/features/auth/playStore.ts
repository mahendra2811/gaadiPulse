import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.pooniya.gaadipulse";
export const PLAY_REVIEW_URL = `${PLAY_STORE_URL}&showAllReviews=true`;
export const PLAY_UPDATE_VERSION = "1.0.7";
export type PlayUpdateCheck = "unavailable" | "current" | "available";

export async function checkPlayUpdate(): Promise<PlayUpdateCheck> {
  if (Platform.OS !== "android" || __DEV__) return "unavailable";
  const { default: SpInAppUpdates } = await import("sp-react-native-in-app-updates");
  const updates = new SpInAppUpdates(false);
  const result = await updates.checkNeedsUpdate({
    curVersion: Constants.expoConfig?.version ?? "0.0.0",
  });
  return result.shouldUpdate ? "available" : "current";
}

export async function openPlayStore(url = PLAY_STORE_URL) {
  try {
    await Linking.openURL(url);
  } catch {
    // Browser fallback when the Play Store app cannot handle the listing link.
    await Linking.openURL(PLAY_STORE_URL);
  }
}

export async function checkAndStartPlayUpdate() {
  if (Platform.OS !== "android" || __DEV__) {
    await openPlayStore();
    return "store" as const;
  }

  const { default: SpInAppUpdates, IAUUpdateKind } = await import("sp-react-native-in-app-updates");
  const updates = new SpInAppUpdates(false);
  const result = await updates.checkNeedsUpdate({
    curVersion: Constants.expoConfig?.version ?? "0.0.0",
  });

  if (!result.shouldUpdate) return "current" as const;

  await updates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE });
  return "started" as const;
}
