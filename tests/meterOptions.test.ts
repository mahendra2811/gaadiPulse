import { describe, expect, it } from "vitest";
import { allowedMeterModes } from "../src/features/garage/meterOptions";
describe("vehicle meter choices", () => {
  it("limits road bikes and cars to kilometres", () => {
    expect(allowedMeterModes("two_wheeler", "motorcycle")).toEqual(["KM"]);
    expect(allowedMeterModes("four_wheeler", "electric_car")).toEqual(["KM"]);
  });
  it("offers dual tracking for supported machinery and commercial subtypes", () => {
    expect(allowedMeterModes("agricultural", "tractor")).toEqual([
      "KM",
      "HOURS",
      "BOTH",
    ]);
    expect(allowedMeterModes("commercial", "tipper")).toEqual([
      "KM",
      "HOURS",
      "BOTH",
    ]);
    expect(allowedMeterModes("heavy_machinery", "generator")).toEqual([
      "HOURS",
    ]);
  });
  it("waits for subtype and handles category-specific Other defaults", () => {
    expect(allowedMeterModes("four_wheeler", "")).toEqual([]);
    expect(allowedMeterModes("four_wheeler", "other")).toEqual(["KM"]);
    expect(allowedMeterModes("heavy_machinery", "other")).toEqual(["HOURS"]);
  });
});
