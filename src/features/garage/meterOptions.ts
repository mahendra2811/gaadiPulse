/** Suggested meter modes are defaults; a vehicle's real meters remain editable. */
export function allowedMeterModes(
  _category: string,
  _subtype: string,
): ("KM" | "HOURS" | "BOTH")[] {
  return ["KM", "HOURS", "BOTH"];
}
