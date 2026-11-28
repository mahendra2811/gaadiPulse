import { formatDate } from "@/src/lib/i18n";

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
      date: formatDate(
        date,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
        zone,
      ),
      time: dateOnly
        ? ""
        : formatDate(
            date,
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            },
            zone,
          ),
      zone,
    };
  } catch {
    return {
      date: formatDate(
        date,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
        "UTC",
      ),
      time: dateOnly
        ? ""
        : formatDate(
            date,
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            },
            "UTC",
          ),
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
