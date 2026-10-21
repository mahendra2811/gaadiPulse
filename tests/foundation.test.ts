import { describe, it, expect } from "vitest";
import {
  normalizeRegistration,
  defaultMeter,
  vehicleSchema,
  selectActive,
  type Vehicle,
} from "../src/features/garage/schema";
import { en } from "../src/lib/i18n";
describe("vehicle foundation", () => {
  it("normalizes optional registration without asserting legal validity", () => {
    expect(normalizeRegistration(" dl 01 ab-1234 ")).toBe("DL01AB1234");
    expect(normalizeRegistration("")).toBe("");
  });
  it("defaults meters by actual vehicle type", () => {
    expect(defaultMeter("heavy_machinery", "excavator")).toBe("HOURS");
    expect(defaultMeter("commercial", "tipper")).toBe("BOTH");
    expect(defaultMeter("agricultural", "tractor")).toBe("BOTH");
    expect(defaultMeter("two_wheeler", "scooter")).toBe("KM");
  });
  const base = {
    nickname: "Tractor",
    registration_number: "",
    category: "agricultural",
    subtype: "tractor",
    brand: "",
    model: "",
    energy_type: "DIESEL",
    meter_mode: "BOTH",
    timezone: "Asia/Kolkata",
    km: "",
    hours: "",
    observed_at: "2026-10-21T06:00:00Z",
  };
  it("accepts absent baseline readings and unregistered machinery", () =>
    expect(vehicleSchema.safeParse(base).success).toBe(true));
  it("rejects negative or malformed readings and invalid timezone", () => {
    for (const patch of [
      { km: "-1" },
      { hours: "NaN" },
      { timezone: "Mars/Olympus" },
    ])
      expect(vehicleSchema.safeParse({ ...base, ...patch }).success).toBe(
        false,
      );
  });
  it("requires an identifying label", () =>
    expect(vehicleSchema.safeParse({ ...base, nickname: "" }).success).toBe(
      false,
    ));
  it("falls back when selected vehicle is revoked or archived", () => {
    const vehicles = [
      { id: "a", archived_at: "2026-01-01" },
      { id: "b", archived_at: null },
    ] as Vehicle[];
    expect(selectActive(vehicles, "a")).toBe("b");
    expect(selectActive(vehicles, "revoked")).toBe("b");
    expect(selectActive([], "a")).toBe(null);
  });
  it("has an English-only future locale label", () => {
    expect(en.hindi).toContain("coming later");
    expect(
      Object.values(en).every((v) => typeof v === "string" && v.length > 0),
    ).toBe(true);
  });
});
