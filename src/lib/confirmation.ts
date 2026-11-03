export type ConfirmationOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
};
export type Confirmation = {
  title: string;
  body: string;
  action: () => void;
  options: ConfirmationOptions;
};
let current: Confirmation | null = null;
const listeners = new Set<() => void>();
export const subscribeConfirmation = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const currentConfirmation = () => current;
export function requestConfirmation(
  title: string,
  body: string,
  action: () => void,
  options: ConfirmationOptions = {},
) {
  // Repeated Back taps must not queue multiple leave actions.
  if (current) return;
  current = { title, body, action, options };
  listeners.forEach((listener) => listener());
}
export function dismissConfirmation(accept = false) {
  const request = current;
  current = null;
  listeners.forEach((listener) => listener());
  if (accept) request?.action();
}
