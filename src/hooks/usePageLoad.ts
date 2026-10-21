import { useEffect, useMemo, useState } from "react";
import { PageLoadCoordinator, type LoadState } from "@/src/lib/pageLoad";
/** Pass memoized prerequisites. Query-driven screens can pass query.isPending directly to LoadingLine. */
export function usePageLoad(
  key: string,
  prerequisites: (() => Promise<unknown>)[],
) {
  const [state, setState] = useState<LoadState>({
    pending: true,
    completed: 0,
    total: 0,
    error: null,
  });
  const coordinator = useMemo(() => new PageLoadCoordinator(setState), []);
  useEffect(() => {
    void coordinator.run(prerequisites);
    return () => coordinator.cancel();
  }, [key, prerequisites, coordinator]);
  return {
    ...state,
    progress: state.total ? state.completed / state.total : undefined,
    cancel: () => coordinator.cancel(),
  };
}
