import { describe, expect, it } from "vitest";
import {
  formatMinorUnits,
  isCurrencyCode,
  minorUnitsDecimal,
  parseMinorUnits,
  solveCurrencyFuel,
} from "@/src/utils/currency";
describe("currency minor units", () => {
  it("parses and formats zero, two and three decimal currencies exactly", () => {
    expect(parseMinorUnits("123.45", "INR")).toBe(12345);
    expect(parseMinorUnits("123.45", "USD")).toBe(12345);
    expect(parseMinorUnits("123", "JPY")).toBe(123);
    expect(parseMinorUnits("1.234", "KWD")).toBe(1234);
    expect(minorUnitsDecimal(1234, "KWD")).toBe("1.234");
    expect(formatMinorUnits(123, "JPY", "en-US")).toContain("123");
    expect(formatMinorUnits(1234, "KWD", "en-US")).toContain("1.234");
  });
  it("rejects wrong precision, unsafe values, negatives and invalid codes", () => {
    expect(() => parseMinorUnits("1.2", "JPY")).toThrow();
    expect(() => parseMinorUnits("1.2345", "KWD")).toThrow();
    expect(() => parseMinorUnits("-1", "INR")).toThrow();
    expect(() => parseMinorUnits("90071992547409.92", "INR")).toThrow();
    expect(parseMinorUnits("0", "INR", true)).toBe(0);
    expect(isCurrencyCode("XXX")).toBe(false);
  });
  it("preserves large minor units and negative fractional values in formatting", () => {
    expect(minorUnitsDecimal(Number.MAX_SAFE_INTEGER, "INR")).toBe(
      "90071992547409.91",
    );
    expect(formatMinorUnits(Number.MAX_SAFE_INTEGER, "INR", "en-IN")).toContain(
      "91",
    );
    expect(formatMinorUnits(1234, "KWD", "ar-EG")).toContain("١٫٢٣٤");
    expect(minorUnitsDecimal(-1, "USD")).toBe("-0.01");
    expect(formatMinorUnits(-1, "USD", "en-US")).toContain("0.01");
  });
  it("solves fuel using each currency's minor units without floating point money arithmetic", () => {
    expect(solveCurrencyFuel("", "12.500", "150", "JPY")).toEqual({
      amount_minor: 1875,
      unit_price_minor: 150,
      quantity: 12.5,
    });
    expect(solveCurrencyFuel("", "12.500", "0.235", "KWD")).toEqual({
      amount_minor: 2938,
      unit_price_minor: 235,
      quantity: 12.5,
    });
    expect(() => solveCurrencyFuel("10", "2", "9", "USD")).toThrow(
      "inconsistent",
    );
    expect(() => solveCurrencyFuel("", "0", "12", "USD")).toThrow();
  });
});
