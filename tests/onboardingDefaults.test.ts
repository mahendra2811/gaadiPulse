import { describe, expect, it } from "vitest";
import {
  localeCountry,
  onboardingDefaults,
  singleCountryTimezone,
  timezoneAfterCountryChange,
} from "@/src/features/auth/onboardingDefaults";
describe("onboarding suggestions", () => {
  it("uses an explicit supported device region without guessing a region from language", () => {
    expect(localeCountry("en-IN")).toBe("IN");
    expect(localeCountry("en")).toBeNull();
    expect(localeCountry("invalid_locale_!")).toBeNull();
    expect(onboardingDefaults("en-IN", "America/New_York")).toEqual({
      country: "IN",
      timezone: "Asia/Kolkata",
    });
  });
  it("keeps the device zone for multi-zone countries and preserves manual choices", () => {
    expect(singleCountryTimezone("US")).toBeNull();
    expect(onboardingDefaults("en-US", "America/Chicago").timezone).toBe(
      "America/Chicago",
    );
    expect(timezoneAfterCountryChange("IN", "America/Chicago", false)).toBe(
      "Asia/Kolkata",
    );
    expect(timezoneAfterCountryChange("IN", "America/Chicago", true)).toBe(
      "America/Chicago",
    );
    expect(timezoneAfterCountryChange("US", "Asia/Kolkata", false)).toBe(
      "Asia/Kolkata",
    );
  });
});
