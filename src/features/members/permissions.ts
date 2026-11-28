export const pilotPermissionGroups = [
  { title: "Fuel", read: "fuel.read", create: "fuel.create" },
  { title: "Expenses", read: "expenses.read", create: "expenses.create" },
  { title: "Meter readings", read: "meters.read", create: "meters.create" },
] as const;
export function effectivePilotPermission(
  key: string,
  overrides: Record<string, boolean>,
  defaults: Record<string, boolean>
): boolean {
  return overrides[key] ?? defaults[key] ?? true;
}
export function resetPilotOverrides(overrides: Record<string, boolean>) {
  const next = { ...overrides };
  for (const group of pilotPermissionGroups) {
    delete next[group.read];
    delete next[group.create];
  }
  return next;
}
export function pilotPermissionSummary(
  overrides: Record<string, boolean>,
  defaults: Record<string, boolean>
) {
  return pilotPermissionGroups
    .map((group) => {
      const read = effectivePilotPermission(group.read, overrides, defaults);
      const create = effectivePilotPermission(group.create, overrides, defaults);
      return `${group.title}: ${read && create ? "view & add" : read ? "view" : create ? "add" : "no access"}`;
    })
    .join(" · ");
}

export const BACKDATE_OPTIONS = [0, 1, 2, 10, 30, 60, -1] as const;
export function effectiveBackdateDays(
  override: number | null | undefined,
  defaults: Record<string, unknown>
) {
  const value = override ?? defaults["records.backdate_days"] ?? 1;
  return typeof value === "number" &&
    BACKDATE_OPTIONS.includes(value as (typeof BACKDATE_OPTIONS)[number])
    ? value
    : 1;
}
