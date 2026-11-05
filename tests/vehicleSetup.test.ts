import { describe, expect, it } from "vitest";
import {
  allowedFuelTypes,
  fuelUnit,
  vehicleEnergyTypes,
} from "@/src/features/garage/energy";
import {
  availableTimezones,
  defaultVehicleTimezone,
  timezoneLabel,
} from "@/src/features/garage/timezone";
import { vehicleSchema } from "@/src/features/garage/schema";

describe("vehicle setup choices", () => {
  it("shows India as the default and calculates seasonal offsets without losing an existing alias", () => {
    expect(timezoneLabel(defaultVehicleTimezone)).toContain("UTC+05:30");
    expect(
      timezoneLabel("America/New_York", new Date("2026-01-15T12:00:00Z")),
    ).toContain("UTC-05:00");
    expect(
      timezoneLabel("America/New_York", new Date("2026-07-15T12:00:00Z")),
    ).toContain("UTC-04:00");
    expect(availableTimezones("Asia/Calcutta")).toContain("Asia/Calcutta");
    expect(availableTimezones("Asia/Calcutta")[0]).toBe(defaultVehicleTimezone);
  });
  it("describes the same physical fuels and units used by fuel entry", () => {
    const expected: Record<string, string[]> = {
      DIESEL: ["DIESEL:L"],
      PETROL: ["PETROL:L"],
      PETROL_CNG: ["PETROL:L", "CNG:KG"],
      PETROL_LPG: ["PETROL:L", "LPG:L"],
      ELECTRIC: ["ELECTRIC:KWH"],
      HYBRID: ["PETROL:L"],
      PLUGIN_HYBRID: ["PETROL:L", "ELECTRIC:KWH"],
      DIESEL_HYBRID: ["DIESEL:L"],
      CNG: ["CNG:KG"],
      LPG: ["LPG:L"],
      HYDROGEN: ["HYDROGEN:KG"],
      OTHER: ["OTHER:L"],
    };
    for (const profile of vehicleEnergyTypes)
      expect(
        allowedFuelTypes(profile).map((fuel) => `${fuel}:${fuelUnit(fuel)}`),
      ).toEqual(expected[profile]);
  });
  it("requires a name, registration, or model while allowing optional make and starting readings", () => {
    const data = {
      nickname: "",
      registration_number: "",
      brand: "",
      model: "",
      category: "two_wheeler",
      subtype: "scooter",
      energy_type: "PETROL",
      meter_mode: "KM",
      timezone: defaultVehicleTimezone,
      km: "",
      hours: "",
      observed_at: new Date().toISOString(),
    };
    expect(vehicleSchema.safeParse(data).success).toBe(false);
    expect(
      vehicleSchema.safeParse({ ...data, nickname: "Scooter" }).success,
    ).toBe(true);
    expect(vehicleSchema.safeParse({ ...data, model: "Scooter" }).success).toBe(
      true,
    );
    expect(
      vehicleSchema.safeParse({ ...data, registration_number: "RJ19AB1234" })
        .success,
    ).toBe(true);
  });
});
