import { defaultMeter } from "./schema";
export function allowedMeterModes(
  category: string,
  subtype: string,
): ("KM" | "HOURS" | "BOTH")[] {
  if (!subtype) return [];
  const mode = defaultMeter(category, subtype);
  return mode === "BOTH" ? ["KM", "HOURS", "BOTH"] : [mode];
}
