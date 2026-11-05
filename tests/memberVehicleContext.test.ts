import { describe, expect, it } from "vitest";
import { resolveMemberVehicle } from "../src/features/members/vehicleContext";

describe("member management vehicle context", () => {
  const vehicles = [{ id: "first" }, { id: "second" }];
  it("uses the vehicle in the link even when another vehicle is active", () => {
    expect(resolveMemberVehicle("second", vehicles, vehicles[0])).toBe(
      vehicles[1],
    );
  });
  it("does not fall back to the active vehicle for an invalid or unavailable link", () => {
    expect(
      resolveMemberVehicle("missing", vehicles, vehicles[0]),
    ).toBeUndefined();
    expect(
      resolveMemberVehicle("second", undefined, vehicles[0]),
    ).toBeUndefined();
  });
  it("uses the active vehicle when opened from the general menu", () => {
    expect(resolveMemberVehicle(undefined, vehicles, vehicles[0])).toBe(
      vehicles[0],
    );
  });
});
