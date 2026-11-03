import { AccessibilityInfo, Platform } from "react-native";
import { successFeedback } from "./feedback";
export type ToastType = "success" | "error" | "warning" | "info" | "reminder";
export type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
  expiresAt: number;
};
export const TOAST_DURATION_MS = 3000;
let current: ToastMessage | null = null;
let sequence = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const getToast = () => current;
export const subscribeToast = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function dismissToast(id?: number) {
  if (id !== undefined && current?.id !== id) return;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  current = null;
  emit();
}
export function showToast(message: string, type: ToastType = "info") {
  const text = message.trim();
  if (!text) return;
  if (timer !== undefined) clearTimeout(timer);
  const id = ++sequence;
  current = {
    id,
    message: text,
    type,
    expiresAt: Date.now() + TOAST_DURATION_MS,
  };
  timer = setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
  emit();
  if (type === "success") void successFeedback();
  if (Platform.OS !== "web") AccessibilityInfo.announceForAccessibility(text);
}
