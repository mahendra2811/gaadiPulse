import { describe, it, expect } from "vitest";
import { authDestination, profileRedirect } from "../src/features/auth/routing";
describe("auth route boundaries", () => {
  it("always sends signed-out users to auth", () =>
    expect(authDestination(false, true, true)).toBe("/auth/login"));
  it("waits for profile before choosing first destination", () =>
    expect(authDestination(true, false, false)).toBeNull());
  it("requires profile setup before first garage", () =>
    expect(authDestination(true, true, false)).toBe("/settings/profile"));
  it("returns established accounts to their garage tabs", () =>
    expect(authDestination(true, true, true)).toBe("/(tabs)"));
});

describe("profile setup routing", () => {
  it("requires a name on app entry and vehicle deep links", () => {
    expect(profileRedirect("/", false)).toBe("/settings/profile");
    expect(profileRedirect("/garage/add", false)).toBe("/settings/profile");
    expect(profileRedirect("/settings/profile", false)).toBeNull();
  });
  it("keeps recovery and legal pages open and sends signed-in auth pages home", () => {
    expect(profileRedirect("/auth/reset-password", false)).toBeNull();
    expect(profileRedirect("/auth/legal", false)).toBeNull();
    expect(profileRedirect("/auth/login", true)).toBe("/(tabs)");
    expect(profileRedirect("/garage/add", true)).toBeNull();
  });
});
