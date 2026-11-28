import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";
import { Platform } from "react-native";
import { reviewPromptIsDue, type ReviewState } from "./reviewPolicy";

const REVIEW_STATE_KEY = "gaadipulse.review-prompt.v1";
const FIRST_LAUNCH_KEY = "gaadipulse.first-launch-at.v1";
const SUCCESS_THRESHOLD = 5;
const SUCCESS_INTERVAL = 10;
let firstLaunchPromise: Promise<number> | undefined;
let reviewRequestInFlight = false;

export function initializeReviewPrompt() {
  firstLaunchPromise ??= (async () => {
    const existing = Number(await SecureStore.getItemAsync(FIRST_LAUNCH_KEY));
    if (Number.isFinite(existing) && existing > 0) return existing;
    const now = Date.now();
    await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, String(now));
    return now;
  })();
  return firstLaunchPromise;
}

/** Record a successful meaningful action; a separate safe-screen effect requests the review. */
export async function maybeRequestReviewAfterSave() {
  if (Platform.OS === "web") return;
  try {
    await initializeReviewPrompt();
    const stored = await SecureStore.getItemAsync(REVIEW_STATE_KEY);
    const state = stored ? (JSON.parse(stored) as Partial<ReviewState>) : {};
    const successfulRecords = (state.successfulRecords ?? 0) + 1;
    const nextPromptAt = state.nextPromptAt ?? SUCCESS_THRESHOLD;
    const lastRequestAt = state.lastRequestAt ?? 0;
    await SecureStore.setItemAsync(
      REVIEW_STATE_KEY,
      JSON.stringify({ successfulRecords, nextPromptAt, lastRequestAt }),
    );
  } catch {
    // Review tracking must never affect a saved record or its success flow.
  }
}

/** Only call this from a stable Home screen, never from a form or error state. */
export async function requestReviewOnSafeScreen() {
  if (Platform.OS === "web" || reviewRequestInFlight) return;
  reviewRequestInFlight = true;
  try {
    const firstLaunchAt = await initializeReviewPrompt();
    const stored = await SecureStore.getItemAsync(REVIEW_STATE_KEY);
    const state = stored ? (JSON.parse(stored) as Partial<ReviewState>) : {};
    const successfulRecords = state.successfulRecords ?? 0;
    const nextPromptAt = state.nextPromptAt ?? SUCCESS_THRESHOLD;
    const lastRequestAt = state.lastRequestAt ?? 0;
    const current = { successfulRecords, nextPromptAt, lastRequestAt };
    if (!reviewPromptIsDue(current, firstLaunchAt, Date.now())) return;
    if (
      !(await StoreReview.isAvailableAsync()) ||
      !(await StoreReview.hasAction())
    )
      return;
    // Record the request attempt before calling Play; Google may silently suppress
    // the native prompt, so the app must not attempt to infer a review submission.
    await SecureStore.setItemAsync(
      REVIEW_STATE_KEY,
      JSON.stringify({
        successfulRecords,
        nextPromptAt: successfulRecords + SUCCESS_INTERVAL,
        lastRequestAt: Date.now(),
      }),
    );
    await StoreReview.requestReview();
  } catch {
    // Google controls quotas and may suppress the native request without a result.
  } finally {
    reviewRequestInFlight = false;
  }
}
