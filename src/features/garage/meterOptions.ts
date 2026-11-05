/** Suggested meter modes are defaults; a vehicle's real meters remain editable. */
export function allowedMeterModes(
  _category: string,
  subtype: string,
): ("KM" | "HOURS" | "BOTH")[] {
  return subtype ? ["KM", "HOURS", "BOTH"] : [];
}
