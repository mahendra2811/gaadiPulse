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

describe("focused release boundaries", () => {
  it("keeps bike/car ledger routes and defers advanced direct links", () => {
    expect(supportsVehicle("two_wheeler")).toBe(true);
    expect(supportsVehicle("four_wheeler")).toBe(true);
    for (const category of ["commercial", "agricultural", "heavy_machinery"])
      expect(supportsVehicle(category)).toBe(false);
    for (const kind of ["fuel", "expenses", "meters"])
      expect(supportsRecord(kind)).toBe(true);
    for (const path of [
      "/owner/members",
      "/owner/form-builder",
      "/progress/approvals",
      "/reports",
      "/maintenance",
      "/records/documents",
      "/records/reminders/add",
      "/records/progress/add",
      "/records/fuel/analytics",
    ])
      expect(deferredPath(path)).toBe(true);
    for (const path of [
      "/garage/add",
      "/records/fuel/add",
      "/records/expenses/edit",
      "/meters/history",
      "/settings/sync",
    ])
      expect(deferredPath(path)).toBe(false);
  });
  it("restores advanced availability without deleting source", () => {
    releaseFeatures.advancedTools = true;
    try {
      expect(supportsVehicle("commercial")).toBe(true);
      expect(supportsRecord("progress")).toBe(true);
      expect(deferredPath("/owner/members")).toBe(false);
    } finally {
      releaseFeatures.advancedTools = false;
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
