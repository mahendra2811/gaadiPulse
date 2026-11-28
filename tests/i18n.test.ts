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
    expect(supportedLocales).toHaveLength(45);
    expect(localeOptions.map((option) => option.nativeName)).toContain(
      "简体中文",
    );
    expect(localeOptions.map((option) => option.englishName)).toContain(
      "Chinese (Simplified)",
    );
    expect(t("languageSearch")).toBe("Search languages");
    setLocale("ar-SA");
    expect(t("languageNoResults")).toBe("No languages match your search.");
    expect(localeOptions.map((option) => option.code)).toContain("brx-IN");
  });

  it("uses a translated Hindi string and falls back for an unfinished locale", () => {
    setLocale("hi-IN");
    expect(t("language")).toBe("भाषा");
    expect(t("deletionContactBody")).toBe(
      "खाता हटाने या गोपनीयता से जुड़े सवालों के लिए ऐप ऑपरेटर से संपर्क करें। अपना पासवर्ड या सत्यापन कोड न भेजें।",
    );
    setLocale("ar-SA");
    expect(t("language")).toBe("Language");
    expect(getLocaleDirection()).toBe("rtl");
  });

  it("falls back to English for an unknown locale and unknown key", () => {
    setLocale("xx-XX");
    expect(getLocale()).toBe("en-IN");
    expect(t("language")).toBe("Language");
  });

  it("uses the namespaced privacy link instead of the document disclaimer", () => {
    expect(t("account.legal")).toBe("Privacy and terms");
    expect(t("records.legal")).toBe(
      "Entered details are not an official RC or DL. Use official DigiLocker or mParivahan for authoritative documents.",
    );
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
