import * as Linking from "expo-linking";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.pooniya.gaadipulse";
export const PLAY_REVIEW_URL = `${PLAY_STORE_URL}&showAllReviews=true`;
export const PLAY_UPDATE_VERSION = "1.0.7";
export type PlayUpdateCheck = "unavailable" | "current" | "available";

export async function checkPlayUpdate(): Promise<PlayUpdateCheck> {
  return "unavailable";
}

export async function openPlayStore(url = PLAY_STORE_URL) {
  await Linking.openURL(url);
}

export async function checkAndStartPlayUpdate() {
  await openPlayStore();
  return "store" as const;
}
