import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isProfileCountry,
  profileCountries,
  profileCountryLabel,
} from "../src/features/auth/countries";

describe("profile country selection", () => {
  it("uses a unique versioned country and territory catalog consistent with server validation", () => {
    const migration = readFileSync(
      "supabase/migrations/202611050017_profile_country.sql",
      "utf8",
    );
    expect(profileCountries.length).toBeGreaterThan(240);
    expect(new Set(profileCountries.map((country) => country.code)).size).toBe(
      profileCountries.length,
    );
    for (const country of profileCountries)
      expect(migration).toContain(`'${country.code}'`);
    expect(profileCountryLabel("IN")).toBe("India");
    expect(profileCountryLabel("US")).toBe("United States");
    expect(isProfileCountry("ZZ")).toBe(false);
    expect(profileCountryLabel("XY")).toBe("XY");
  });
});
