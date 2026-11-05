/** Reversible product rollout controls. These never replace server authorization. */
export const releaseFeatures: Record<"advancedTools", boolean> = {
  advancedTools: true,
};
export function supportsVehicle(category: string) {
  const basic = ["two_wheeler", "four_wheeler"];
  const advanced = ["commercial", "agricultural", "heavy_machinery"];
  return (
    basic.includes(category) ||
    (releaseFeatures.advancedTools && advanced.includes(category))
  );
}
export function supportsRecord(kind: string) {
  const basic = ["fuel", "expenses", "meters"];
  const advanced = ["documents", "reminders"];
  return (
    basic.includes(kind) ||
    (releaseFeatures.advancedTools && advanced.includes(kind))
  );
}
export function deferredPath(path: string) {
  if (
    /^\/progress(?:\/|$)/.test(path) ||
    /^\/owner\/form-builder(?:\/|$)/.test(path) ||
    /^\/records\/progress(?:\/|$)/.test(path)
  )
    return true;
  if (releaseFeatures.advancedTools || path === "/owner/members") return false;
  return (
    /^\/(owner|progress|reports)(\/|$)/.test(path) ||
    /^\/records\/(progress|documents|reminders)(\/|$)/.test(path) ||
    /^\/records\/[^/]+\/analytics(\/|$)/.test(path)
  );
}
