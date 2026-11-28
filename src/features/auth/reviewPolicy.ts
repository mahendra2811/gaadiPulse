export type ReviewState = {
  successfulRecords: number;
  nextPromptAt: number;
  lastRequestAt: number;
};

export const reviewInstallAgeMs = 14 * 24 * 60 * 60 * 1000;
export const reviewCooldownMs = 90 * 24 * 60 * 60 * 1000;

export function reviewPromptIsDue(
  state: ReviewState,
  firstLaunchAt: number,
  now: number,
) {
  return (
    state.successfulRecords >= state.nextPromptAt &&
    now - firstLaunchAt >= reviewInstallAgeMs &&
    (!state.lastRequestAt || now - state.lastRequestAt >= reviewCooldownMs)
  );
}
