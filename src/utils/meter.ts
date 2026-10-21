export type Observation = {
  id: string;
  reading_type: "KM" | "HOURS";
  value: number;
  observed_at: string;
  is_reset?: boolean;
  status?: string;
};
export function measuredIntervals(rows: Observation[]) {
  const result: {
    from: string;
    to: string;
    type: "KM" | "HOURS";
    delta: number;
    anomaly: boolean;
  }[] = [];
  for (const type of ["KM", "HOURS"] as const) {
    const list = rows
      .filter((r) => r.reading_type === type && r.status !== "CORRECTED")
      .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1],
        b = list[i];
      if (b.is_reset) continue;
      const delta = b.value - a.value;
      if (Date.parse(b.observed_at) <= Date.parse(a.observed_at)) continue;
      result.push({
        from: a.observed_at,
        to: b.observed_at,
        type,
        delta,
        anomaly: delta < 0,
      });
    }
  }
  return result;
}
