import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  defaultProfileIcon,
  isProfileIcon,
  profileIcons,
} from "../src/features/auth/avatars";

describe("profile icons", () => {
  it("only permits the bundled identifiers in the database constraint", () => {
    const migration = readFileSync(
      "supabase/migrations/202611050015_profile_icons.sql",
      "utf8",
    );
    expect(profileIcons.length).toBeGreaterThanOrEqual(30);
    expect(new Set(profileIcons).size).toBe(profileIcons.length);
    for (const icon of profileIcons) expect(migration).toContain(`'${icon}'`);
    expect(isProfileIcon(defaultProfileIcon)).toBe(true);
    expect(isProfileIcon("https://example.com/image")).toBe(false);
  });
});
