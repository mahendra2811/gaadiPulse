/** Reversible product rollout controls. These never replace server authorization. */
export const releaseFeatures: Record<"advancedTools", boolean> = {
  advancedTools: false,
};
export function supportsVehicle(category: string) {
  return (
    releaseFeatures.advancedTools ||
    ["two_wheeler", "four_wheeler"].includes(category)
  );
}
export function supportsRecord(kind: string) {
  return (
    releaseFeatures.advancedTools ||
    ["fuel", "expenses", "meters"].includes(kind)
  );
}
export function deferredPath(path: string) {
  if (releaseFeatures.advancedTools) return false;
  return (
    /^\/(owner|progress|reports|maintenance)(\/|$)/.test(path) ||
    /^\/records\/(progress|documents|reminders)(\/|$)/.test(path) ||
    /^\/records\/[^/]+\/analytics(\/|$)/.test(path)
  );
}
