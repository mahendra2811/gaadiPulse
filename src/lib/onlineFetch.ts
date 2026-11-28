import { onlineManager } from "@tanstack/react-query";
import { t } from "./i18n";

/** Fail promptly rather than pause work for an automatic upload on reconnect. */
export const onlineFetch: typeof fetch = async (input, init) => {
  if (!onlineManager.isOnline()) {
    const error = new Error(`NETWORK_UNAVAILABLE: ${t("networkError")}`);
    error.name = "NetworkUnavailableError";
    throw error;
  }
  const controller = new AbortController();
  const original = init?.signal;
  let timedOut = false;
  const abort = () => controller.abort(original?.reason);
  if (original?.aborted) abort();
  else original?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(
        "The request was aborted after timing out.",
      );
      timeoutError.name = "AbortError";
      Object.assign(timeoutError, { code: "REQUEST_TIMEOUT" });
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    original?.removeEventListener("abort", abort);
  }
};
