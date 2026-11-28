import { onlineManager } from "@tanstack/react-query";
import { t } from "./i18n";
import { recordNetworkRequest } from "./networkHealth";

/** Fail promptly rather than pause work for an automatic upload on reconnect. */
export const onlineFetch: typeof fetch = async (input, init) => {
  const isTelemetryRequest = String(input).includes(
    "/functions/v1/collect-analytics",
  );
  if (!onlineManager.isOnline()) {
    const error = new Error(`NETWORK_UNAVAILABLE: ${t("networkError")}`);
    error.name = "NetworkUnavailableError";
    throw error;
  }
  const controller = new AbortController();
  const startedAt = Date.now();
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
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!isTelemetryRequest)
      recordNetworkRequest(
        Date.now() - startedAt,
        response.status < 500 && response.status !== 429,
      );
    return response;
  } catch (error) {
    if (timedOut) {
      if (!isTelemetryRequest)
        recordNetworkRequest(Date.now() - startedAt, false);
      const timeoutError = new Error(
        "The request was aborted after timing out.",
      );
      timeoutError.name = "AbortError";
      Object.assign(timeoutError, { code: "REQUEST_TIMEOUT" });
      throw timeoutError;
    }
    if (!original?.aborted && !isTelemetryRequest)
      recordNetworkRequest(Date.now() - startedAt, false);
    throw error;
  } finally {
    clearTimeout(timeout);
    original?.removeEventListener("abort", abort);
  }
};
