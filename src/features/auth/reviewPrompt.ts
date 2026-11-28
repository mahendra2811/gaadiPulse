import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";

const REVIEW_STATE_KEY = "gaadipulse.review-prompt.v1";
const SUCCESS_THRESHOLD = 5;
const SUCCESS_INTERVAL = 10;

type ReviewState = { successfulRecords: number; lastRequestAt: number };

/** Ask Play for a review only after meaningful use, never from a settings button. */
export async function maybeRequestReviewAfterSave() {
  try {
    const stored = await SecureStore.getItemAsync(REVIEW_STATE_KEY);
    const state = stored ? (JSON.parse(stored) as Partial<ReviewState>) : {};
    const successfulRecords = (state.successfulRecords ?? 0) + 1;
    if (successfulRecords < SUCCESS_THRESHOLD) {
      await SecureStore.setItemAsync(
        REVIEW_STATE_KEY,
        JSON.stringify({
          successfulRecords,
          lastRequestAt: state.lastRequestAt ?? 0,
        })
      );
      return;
    }
    const lastRequestAt = state.lastRequestAt ?? 0;
    if (lastRequestAt && successfulRecords < SUCCESS_THRESHOLD + SUCCESS_INTERVAL) {
      await SecureStore.setItemAsync(
        REVIEW_STATE_KEY,
        JSON.stringify({ successfulRecords, lastRequestAt })
      );
      return;
    }
    if (!(await StoreReview.isAvailableAsync())) {
      await SecureStore.setItemAsync(
        REVIEW_STATE_KEY,
        JSON.stringify({ successfulRecords, lastRequestAt })
      );
      return;
    }
    await SecureStore.setItemAsync(
      REVIEW_STATE_KEY,
      JSON.stringify({ successfulRecords: 0, lastRequestAt: Date.now() })
    );
    setTimeout(() => {
      void StoreReview.requestReview().catch(() => undefined);
    }, 2500);
  } catch {
    // Review prompts must never affect a saved record or its success flow.
  }
}
