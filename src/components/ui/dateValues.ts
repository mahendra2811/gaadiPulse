export type DateFieldMode = "datetime" | "date" | "time";
export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  allowFuture?: boolean;
  mode?: DateFieldMode;
  required?: boolean;
  optional?: boolean;
};
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function localTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
export function fieldDate(value: string, mode: DateFieldMode) {
  const date = new Date(
    mode === "date"
      ? `${value}T12:00:00`
      : mode === "time"
        ? `${localDate(new Date())}T${value || "00:00"}:00`
        : value,
  );
  return Number.isFinite(date.getTime()) ? date : new Date();
}
export function formatDateValue(date: Date, mode: DateFieldMode) {
  return mode === "date"
    ? localDate(date)
    : mode === "time"
      ? localTime(date)
      : date.toISOString();
}
