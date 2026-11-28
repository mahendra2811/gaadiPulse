import { useSyncExternalStore } from "react";
import {
  onlineManager,
  useQuery as useServerQuery,
} from "@tanstack/react-query";
import { t } from "./i18n";

const nonRetryable =
  /NOT_AUTHENTICATED|PERMISSION_DENIED|EMAIL_NOT_VERIFIED|ACCOUNT_DELETION_PENDING|INVALID|FORBIDDEN|401|403/i;
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false;
  const message = error instanceof Error ? error.message : String(error);
  return !nonRetryable.test(message);
}
export function queryRetryDelay(attempt: number) {
  return Math.min(1000 * 2 ** attempt, 8000);
}

// Keep TanStack's overloads/inference while withholding stale results on failure.
// This is an in-memory response cache only; nothing is persisted or queued.
export const useQuery: typeof useServerQuery = ((options, queryClient) => {
  const online = useSyncExternalStore(
    (changed) => onlineManager.subscribe(changed),
    () => onlineManager.isOnline(),
    () => true,
  );
  const result = useServerQuery(options, queryClient);
  const preview = options.queryKey[0] === "local-development";
  if ((!online && !preview) || result.isError) {
    return {
      ...result,
      data: undefined,
      error: result.error ?? new Error(t("offline")),
      isError: true,
      isSuccess: false,
      isPending: false,
      status: "error",
    };
  }
  return result;
}) as typeof useServerQuery;
