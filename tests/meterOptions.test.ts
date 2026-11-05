import { describe, expect, it } from "vitest";
import { allowedMeterModes } from "../src/features/garage/meterOptions";

describe("vehicle meter choices", () => {
  it("allows the actual meter configuration for each vehicle category", () => {
    for (const [category, subtype] of [
      ["two_wheeler", "motorcycle"],
      ["four_wheeler", "electric_car"],
      ["agricultural", "tractor"],
      ["commercial", "tipper"],
      ["heavy_machinery", "generator"],
      ["heavy_machinery", "other"],
    ])
      expect(allowedMeterModes(category, subtype)).toEqual([
        "KM",
        "HOURS",
        "BOTH",
      ]);
  });
  it("waits for subtype selection", () => {
    expect(allowedMeterModes("four_wheeler", "")).toEqual([]);
  });
});
