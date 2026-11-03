export type NumericInputOptions = {
  scale?: number;
  signed?: boolean;
  wholeDigits?: number;
};
/** Accept editing states (empty, '-', '1.') but never strip letters into another number. */
export function isNumericDraft(
  value: string,
  { scale = 3, signed = false, wholeDigits = 12 }: NumericInputOptions = {},
) {
  const sign = signed ? "-?" : "";
  return new RegExp(
    `^${sign}\\d{0,${wholeDigits}}${scale ? `(?:\\.\\d{0,${scale}})?` : ""}$`,
  ).test(value);
}
export function isDecimal(
  value: unknown,
  { scale = 3, signed = false }: NumericInputOptions = {},
) {
  return (
    (typeof value === "string" || typeof value === "number") &&
    new RegExp(
      `^${signed ? "-?" : ""}\\d+${scale ? `(?:\\.\\d{1,${scale}})?` : ""}$`,
    ).test(String(value)) &&
    Number.isFinite(Number(value))
  );
}
export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1)
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export const MAX_METER_VALUE = 999999999999.999;
export function isReading(value: string, positive = false) {
  return (
    isDecimal(value) &&
    Number(value) <= MAX_METER_VALUE &&
    Number(value) >= (positive ? Number.MIN_VALUE : 0)
  );
}
