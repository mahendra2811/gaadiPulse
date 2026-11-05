import { describe, expect, it } from "vitest";
import { resolveTheme } from "../src/lib/themeMode";

describe("theme preference", () => {
  it("uses the device setting when known and light when unavailable", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", null)).toBe("light");
    expect(resolveTheme("system", undefined)).toBe("light");
  });
  it("honors explicit light and dark independently of the device", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });
});
