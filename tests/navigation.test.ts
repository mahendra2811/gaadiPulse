import { describe, expect, it } from "vitest";
import { pageNavigation } from "../src/components/navigation/routes";

describe("page header navigation", () => {
  it("keeps primary tabs free of back arrows", () => {
    for (const path of ["/", "/fuel", "/expenses", "/more"])
      expect(pageNavigation(path).back).toBe(false);
  });
  it("provides More as the direct-link recovery route for its destinations", () => {
    for (const path of [
      "/garage",
      "/reports",
      "/maintenance",
      "/meters/history",
      "/owner/members",
      "/settings",
    ])
      expect(pageNavigation(path)).toMatchObject({
        back: true,
        fallback: "/(tabs)/more",
      });
  });
  it("returns nested garage screens to Garage when history is absent", () => {
    for (const path of ["/garage/add", "/garage/edit", "/garage/vehicle-id"])
      expect(pageNavigation(path)).toMatchObject({
        fallback: "/garage",
        section: "garage",
      });
  });
  it("uses readable sections and parent record routes for dynamic URLs", () => {
    for (const action of ["add", "analytics", "record-uuid"])
      expect(pageNavigation(`/records/fuel/${action}`)).toMatchObject({
        section: "fuel",
        fallback: { pathname: "/records/[kind]", params: { kind: "fuel" } },
      });
    expect(pageNavigation("/records/meters/add").fallback).toBe(
      "/meters/history",
    );
  });
  it("recovers settings and authentication deep links", () => {
    expect(pageNavigation("/settings/profile").fallback).toBe("/settings");
    expect(pageNavigation("/auth/verify").fallback).toBe("/auth/login");
    expect(pageNavigation("/auth/welcome").back).toBe(false);
  });
});
