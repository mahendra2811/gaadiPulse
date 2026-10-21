export type FuelPoint = {
  id: string;
  event_at: string;
  quantity: number;
  unit: string;
  energy_type: string;
  is_full_tank: boolean;
  km: number | null;
  hours: number | null;
  reading_at: string | null;
  status?: string;
  amount_paise?: number;
  reset?: boolean;
};
export type FuelInterval = {
  from: string;
  to: string;
  distance: number | null;
  hours: number | null;
  quantity: number;
  unit: string;
  kmPerUnit: number | null;
  unitsPerHour: number | null;
  costPerKm: number | null;
};
export function fuelIntervals(
  entries: FuelPoint[],
  resets: { observed_at: string; is_reset?: boolean }[] = [],
): FuelInterval[] {
  const sorted = entries
    .filter((e) => e.status !== "ARCHIVED")
    .sort(
      (a, b) =>
        Date.parse(a.event_at) - Date.parse(b.event_at) ||
        a.id.localeCompare(b.id),
    );
  const duplicateTimes = new Set(
    sorted
      .filter(
        (e, i) =>
          i > 0 &&
          Date.parse(e.event_at) === Date.parse(sorted[i - 1].event_at),
      )
      .map((e) => Date.parse(e.event_at)),
  );
  const result: FuelInterval[] = [];
  let anchor: FuelPoint | null = null;
  let quantity = 0;
  let amount: number | null = 0;
  let valid = true;
  let previousTime: number | null = null;
  for (const e of sorted) {
    const time = Date.parse(e.event_at);
    if (previousTime === time) valid = false;
    previousTime = time;
    if (
      anchor &&
      (anchor.unit !== e.unit ||
        anchor.energy_type !== e.energy_type ||
        e.reset)
    )
      valid = false;
    if (anchor) {
      quantity += e.quantity;
      amount =
        amount !== null && typeof e.amount_paise === "number"
          ? amount + e.amount_paise
          : null;
    }
    const truthful =
      e.reading_at !== null &&
      Date.parse(e.reading_at) === time &&
      !duplicateTimes.has(time);
    if (
      anchor &&
      resets.some(
        (r) =>
          r.is_reset &&
          Date.parse(r.observed_at) > Date.parse(anchor!.event_at) &&
          Date.parse(r.observed_at) <= time,
      )
    )
      valid = false;
    if (e.is_full_tank && truthful) {
      if (anchor && valid && time > Date.parse(anchor.event_at)) {
        const km =
          e.km !== null && anchor.km !== null ? e.km - anchor.km : null;
        const hours =
          e.hours !== null && anchor.hours !== null
            ? e.hours - anchor.hours
            : null;
        result.push({
          from: anchor.event_at,
          to: e.event_at,
          distance: km !== null && km > 0 ? km : null,
          hours: hours !== null && hours > 0 ? hours : null,
          quantity,
          unit: e.unit,
          costPerKm:
            km !== null && km > 0 && amount !== null ? amount / km : null,
          kmPerUnit:
            km !== null && km > 0 && quantity > 0 ? km / quantity : null,
          unitsPerHour:
            hours !== null && hours > 0 && quantity > 0
              ? quantity / hours
              : null,
        });
      }
      anchor = e;
      quantity = 0;
      amount = 0;
      valid = true;
    } else if (e.is_full_tank) {
      anchor = null;
      quantity = 0;
      amount = 0;
      valid = true;
    }
  }
  return result;
}
