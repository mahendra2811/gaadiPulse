import { describe, expect, it } from "vitest";
import { reviewPromptIsDue } from "../src/features/auth/reviewPolicy";

const day = 24 * 60 * 60 * 1000;
const eligible = { successfulRecords: 5, nextPromptAt: 5, lastRequestAt: 0 };

describe("in-app review prompt policy", () => {
  it("waits for meaningful use and at least two weeks after first launch", () => {
    expect(reviewPromptIsDue(eligible, 0, 13 * day)).toBe(false);
    expect(reviewPromptIsDue(eligible, 0, 14 * day)).toBe(true);
    expect(
      reviewPromptIsDue({ ...eligible, successfulRecords: 4 }, 0, 30 * day),
    ).toBe(false);
  });

  it("requires ten additional successful records and a 90-day cooldown", () => {
    const afterFirstRequest = {
      successfulRecords: 14,
      nextPromptAt: 15,
      lastRequestAt: 20 * day,
    };
    expect(reviewPromptIsDue(afterFirstRequest, 0, 110 * day)).toBe(false);
    expect(
      reviewPromptIsDue(
        { ...afterFirstRequest, successfulRecords: 15 },
        0,
        110 * day,
      ),
    ).toBe(true);
    expect(
      reviewPromptIsDue(
        { ...afterFirstRequest, successfulRecords: 15 },
        0,
        109 * day,
      ),
    ).toBe(false);
  });
});
