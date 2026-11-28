import { onlineManager } from "@tanstack/react-query";
import { t } from "./i18n";

/** Fail promptly rather than pause work for an automatic upload on reconnect. */
export const onlineFetch: typeof fetch = async (input, init) => {
  if (!onlineManager.isOnline()) throw new Error(t("networkError"));
  const controller = new AbortController();
  const original = init?.signal;
  const abort = () => controller.abort();
  if (original?.aborted) controller.abort();
  else original?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 20000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    original?.removeEventListener("abort", abort);
  }
};
