/** UI formatting only. Persisted and exported timestamps remain ISO instants. */
export function displayDateTime(
  value: string | undefined | null,
  timezone?: string,
) {
  if (!value) return { date: "—", time: "", zone: timezone };
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime()))
    return { date: "—", time: "", zone: timezone };
  const zone = dateOnly ? "UTC" : timezone;
  try {
    return {
      date: date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: zone,
      }),
      time: dateOnly
        ? ""
        : date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: zone,
          }),
      zone,
    };
  } catch {
    return {
      date: date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      time: dateOnly
        ? ""
        : date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "UTC",
          }),
      zone: "UTC",
    };
  }
}
export function readableDateTime(
  value: string | undefined | null,
  timezone?: string,
) {
  const result = displayDateTime(value, timezone);
  return result.time ? `${result.date} · ${result.time}` : result.date;
}
