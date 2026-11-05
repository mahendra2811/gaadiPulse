import { describe, expect, it } from "vitest";
import {
  effectivePilotPermission,
  resetPilotOverrides,
  pilotPermissionSummary,
} from "@/src/features/members/permissions";
describe("vehicle Pilot permissions", () => {
  it("applies personal overrides before vehicle defaults and the server fallback", () => {
    expect(
      effectivePilotPermission("fuel.read", {}, { "fuel.read": false }),
    ).toBe(false);
    expect(
      effectivePilotPermission(
        "fuel.read",
        { "fuel.read": true },
        { "fuel.read": false },
      ),
    ).toBe(true);
    expect(effectivePilotPermission("meters.create", {}, {})).toBe(true);
  });
  it("resets the six editable permissions without discarding other stored overrides", () => {
    const input = {
      "fuel.read": false,
      "meters.create": true,
      "documents.read": false,
    };
    expect(resetPilotOverrides(input)).toEqual({ "documents.read": false });
    expect(input["fuel.read"]).toBe(false);
  });
  it("summarizes effective permission combinations from defaults and overrides", () => {
    expect(
      pilotPermissionSummary(
        { "fuel.read": false, "meters.create": false },
        { "expenses.read": false, "expenses.create": false },
      ),
    ).toBe("Fuel: add · Expenses: no access · Meter readings: view");
  });
});
