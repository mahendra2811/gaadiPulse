import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { addEventListener } from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useAccountId } from "@/src/features/auth/session";
import { synchronize, cancelSynchronization } from "@/src/features/records/api";
import { writeLocal } from "@/src/lib/localStore";
export function useOutboxSync() {
  const { development } = useSession();
  const user = useAccountId();
  const query = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user || development) return;
    let active = true;
    let running = false;
    const run = async () => {
      if (running || !active) return;
      running = true;
      try {
        const result = await synchronize(user);
        if (active) {
          setError(null);
          if (result.completed > 0)
            await writeLocal(`user.${user}.lastSync`, new Date().toISOString());
          await query.invalidateQueries();
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        running = false;
      }
    };
    void run();
    const network = addEventListener((state) => {
      if (state.isConnected) void run();
    });
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });
    const timer = setInterval(() => void run(), 30000);
    return () => {
      active = false;
      cancelSynchronization();
      network();
      app.remove();
      clearInterval(timer);
    };
  }, [user, development, query]);
  return error;
}
