import zones from "./timezones.json";

export const defaultVehicleTimezone = "Asia/Kolkata";

export function timezoneLabel(zone: string, at: Date = new Date()): string {
  const place =
    zone === defaultVehicleTimezone
      ? "India (IST)"
      : zone === "UTC"
        ? "Coordinated Universal Time"
        : zone.replaceAll("_", " ").replaceAll("/", " / ");
  if (zone === defaultVehicleTimezone) return `${place} · UTC+05:30`;
  if (zone === "UTC") return `${place} · UTC+00:00`;
  try {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
    const match = offset?.match(
      /^(?:GMT|UTC)(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/,
    );
    if (match)
      return `${place} · UTC${match[1] ?? "+"}${(match[2] ?? "0").padStart(2, "0")}:${match[3] ?? "00"}`;
  } catch {
    // The selected IANA zone remains stored even if the device cannot format its offset.
  }
  return place;
}

export function availableTimezones(selected: string): string[] {
  // Preserve older valid IANA aliases, even when the bundled catalog uses a canonical name.
  const supported = zones.filter((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
      return true;
    } catch {
      return false;
    }
  });
  return [
    defaultVehicleTimezone,
    ...new Set(
      [selected, ...supported].filter(
        (zone) => zone && zone !== defaultVehicleTimezone,
      ),
    ),
  ];
}
