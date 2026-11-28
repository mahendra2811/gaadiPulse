import { describe, expect, it } from "vitest";
import { summaryBounds } from "@/src/features/dashboard/summaryPeriod";

describe("dashboard summary period bounds", () => {
  it("starts the week on Monday in the vehicle time zone", () => {
    const bounds = summaryBounds(
      Date.parse("2026-11-28T12:00:00.000Z"),
      "Asia/Kolkata",
      "week",
    );
    expect(bounds).toEqual({ start: "2026-11-23", end: "2026-11-28" });
  });

  it("uses the vehicle-local calendar month and current local day", () => {
    const bounds = summaryBounds(
      Date.parse("2026-12-01T01:00:00.000Z"),
      "America/Los_Angeles",
      "month",
    );
    expect(bounds).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });
});
