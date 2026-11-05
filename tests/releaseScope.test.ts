import { describe, expect, it } from "vitest";
import {
  deferredPath,
  releaseFeatures,
  supportsRecord,
  supportsVehicle,
} from "../src/features/release/scope";
import {
  allowedFuelTypes,
  defaultFuel,
  fuelUnit,
} from "../src/features/garage/energy";

describe("release boundaries", () => {
  it("enables all existing vehicle categories and advanced routes", () => {
    expect(supportsVehicle("two_wheeler")).toBe(true);
    expect(supportsVehicle("four_wheeler")).toBe(true);
    for (const category of ["commercial", "agricultural", "heavy_machinery"])
      expect(supportsVehicle(category)).toBe(true);
    for (const kind of ["fuel", "expenses", "meters", "documents", "reminders"])
      expect(supportsRecord(kind)).toBe(true);
    expect(supportsVehicle("unknown")).toBe(false);
    expect(supportsRecord("unknown")).toBe(false);
    expect(supportsRecord("progress")).toBe(false);
    for (const path of [
      "/owner/form-builder",
      "/progress/approvals",
      "/records/progress/add",
    ])
      expect(deferredPath(path)).toBe(true);
    for (const path of [
      "/reports",
      "/records/documents",
      "/records/reminders/add",
      "/records/fuel/analytics",
    ])
      expect(deferredPath(path)).toBe(false);
    for (const path of [
      "/owner/members",
      "/garage/add",
      "/records/fuel/add",
      "/records/expenses/edit",
      "/meters/history",
      "/settings/sync",
    ])
      expect(deferredPath(path)).toBe(false);
  });
  it("retains the focused-release switch without removing source", () => {
    releaseFeatures.advancedTools = false;
    try {
      expect(supportsVehicle("commercial")).toBe(false);
      expect(supportsRecord("progress")).toBe(false);
      expect(deferredPath("/owner/members")).toBe(false);
    } finally {
      releaseFeatures.advancedTools = true;
    }
  });
  it("selects charging and correct units without offering petrol to an EV", () => {
    expect(defaultFuel("ELECTRIC")).toEqual({
      energy_type: "ELECTRIC",
      unit: "KWH",
    });
    expect(allowedFuelTypes("ELECTRIC")).toEqual(["ELECTRIC"]);
    expect(allowedFuelTypes("PLUGIN_HYBRID")).toEqual(["PETROL", "ELECTRIC"]);
    expect(allowedFuelTypes("HYBRID")).toEqual(["PETROL"]);
    expect(allowedFuelTypes("PETROL_CNG")).toEqual(["PETROL", "CNG"]);
    expect(fuelUnit("CNG")).toBe("KG");
    expect(fuelUnit("LPG")).toBe("L");
  });
});
