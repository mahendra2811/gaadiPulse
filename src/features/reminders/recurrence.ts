/** Advances calendar recurrence in the vehicle's IANA zone, including DST and month ends. */
export function nextRecurrence(
  value: string,
  repeat: string,
  timezone = "Asia/Kolkata",
) {
  if (repeat !== "MONTHLY" && repeat !== "YEARLY") return null;
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (name: string) =>
    Number(parts.find((item) => item.type === name)?.value);
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const minute = part("minute");
  const second = part("second");
  let nextYear = year;
  let nextMonth = month;
  if (repeat === "MONTHLY") {
    nextMonth += 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
  } else nextYear += 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const targetWallTime = Date.UTC(
    nextYear,
    nextMonth - 1,
    Math.min(day, lastDay),
    hour,
    minute,
    second,
  );
  let guess = targetWallTime;
  for (let attempt = 0; attempt < 4; attempt++) {
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const valueOf = (name: string) =>
      Number(local.find((item) => item.type === name)?.value);
    const represented = Date.UTC(
      valueOf("year"),
      valueOf("month") - 1,
      valueOf("day"),
      valueOf("hour"),
      valueOf("minute"),
      valueOf("second"),
    );
    guess += targetWallTime - represented;
  }
  return new Date(guess).toISOString();
}
