import { describe, expect, it } from "vitest";
import { nextRecurrence } from "@/src/features/reminders/recurrence";

describe("timezone-aware reminder recurrence", () => {
  it("clamps a month-end date and preserves the vehicle-local time", () => {
    expect(
      nextRecurrence("2026-01-31T03:30:00.000Z", "MONTHLY", "Asia/Kolkata"),
    ).toBe("2026-02-28T03:30:00.000Z");
  });

  it("keeps the local clock time across a daylight-saving transition", () => {
    expect(
      nextRecurrence(
        "2026-03-08T14:00:00.000Z",
        "MONTHLY",
        "America/Los_Angeles",
      ),
    ).toBe("2026-04-08T14:00:00.000Z");
  });

  it("does not recur a one-time reminder", () => {
    expect(nextRecurrence("2026-01-01T00:00:00.000Z", "NONE")).toBeNull();
  });
});
