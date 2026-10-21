import { describe, it, expect } from "vitest";
import { authDestination } from "../src/features/auth/routing";
describe("auth route boundaries", () => {
  it("always sends signed-out users to auth", () =>
    expect(authDestination(false, true, true)).toBe("/auth/welcome"));
  it("waits for profile before choosing first destination", () =>
    expect(authDestination(true, false, false)).toBeNull());
  it("requires profile setup before first garage", () =>
    expect(authDestination(true, true, false)).toBe("/settings/profile"));
  it("returns established accounts to their garage tabs", () =>
    expect(authDestination(true, true, true)).toBe("/(tabs)"));
});
