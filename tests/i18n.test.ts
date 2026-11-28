import { afterEach, describe, expect, it } from "vitest";
import {
  getLocale,
  getLocaleDirection,
  formatDate,
  formatNumber,
  localeOptions,
  setLocale,
  supportedLocales,
  t,
} from "../src/lib/i18n";

afterEach(() => setLocale("en-IN"));

describe("locale registry and fallback", () => {
  it("keeps supported locales, picker options, and catalogs registered together", () => {
    expect(localeOptions.map((option) => option.code)).toEqual(
      supportedLocales,
    );
    expect(localeOptions.map((option) => option.code)).toEqual([
      "en-IN",
      "hi-IN",
    ]);
  });

  it("uses a translated Hindi string and falls back for a blank Hindi entry", () => {
    setLocale("hi-IN");
    expect(t("language")).toBe("भाषा");
    expect(t("deletionContactBody")).toBe(
      "For deletion or privacy questions, contact the app operator. Do not send your password or verification code.",
    );
  });

  it("falls back to English for an unknown locale and unknown key", () => {
    setLocale("xx-XX");
    expect(getLocale()).toBe("en-IN");
    expect(t("language")).toBe("Language");
  });

  it("formats numbers and dates with the selected locale and timezone", () => {
    setLocale("hi-IN");
    const date = new Date("2026-01-02T12:00:00.000Z");
    expect(formatNumber(12345.6)).toBe(
      new Intl.NumberFormat("hi-IN").format(12345.6),
    );
    expect(formatDate(date, { year: "numeric" }, "UTC")).toBe(
      new Intl.DateTimeFormat("hi-IN", {
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
    );
    expect(getLocaleDirection()).toBe("ltr");
  });
});
