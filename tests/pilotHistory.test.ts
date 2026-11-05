import { expect, it } from "vitest";
import { isPilotHistoryVisible } from "../src/features/members/history";

it("uses today and yesterday in the vehicle time zone, including across a month boundary", () => {
  const now = Date.parse("2026-11-01T00:00:00+05:30");
  expect(
    isPilotHistoryVisible("2026-10-30T18:30:00Z", "Asia/Kolkata", now),
  ).toBe(true);
  expect(
    isPilotHistoryVisible("2026-10-30T18:29:59Z", "Asia/Kolkata", now),
  ).toBe(false);
  expect(
    isPilotHistoryVisible("2026-11-01T18:30:00Z", "Asia/Kolkata", now),
  ).toBe(false);
  expect(isPilotHistoryVisible("invalid", "Asia/Kolkata", now)).toBe(false);
  expect(
    isPilotHistoryVisible(
      "2026-10-31",
      "America/Los_Angeles",
      Date.parse("2026-11-01T07:30:00Z"),
    ),
  ).toBe(true);
  expect(
    isPilotHistoryVisible(
      "2026-10-30",
      "America/Los_Angeles",
      Date.parse("2026-11-01T07:30:00Z"),
    ),
  ).toBe(false);
});
