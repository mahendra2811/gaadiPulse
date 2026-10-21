import { cancelSynchronization } from '@/src/features/records/api';
import { clearDeviceNotifications } from "@/src/features/reminders/notifications";
import { clearOperations } from "@/src/lib/sync/outbox";
import { removeUserLocal, removeUserCaches } from "@/src/lib/localStore";
import {
  DEVELOPMENT_USER,
  requireDevelopment,
} from "@/src/features/development/repository";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { type Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { client, supabase, secureStorage } from "@/src/lib/supabase";
import { clearUserData } from "@/src/lib/db";
import { useUI } from "@/src/state/ui";
type AuthState = {
  session: Session | null;
  development: boolean;
  startDevelopment: () => Promise<void>;
  loading: boolean;
  error: string | null;
  retry: () => void;
  signOut: () => Promise<void>;
};
const Context=createContext<AuthState|null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const authGeneration = useRef(0);
  const [development, setDevelopment] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (development) return;
    if (!supabase) return;
    let alive = true;
    const apply = async (next: Session | null) => {
      const generation = ++authGeneration.current;
      setLoading(true);
      setError(null);
      try {
        if (previousUser.current && previousUser.current !== next?.user.id) {
          await query.cancelQueries();
          await removeUserCaches(previousUser.current);
          await clearDeviceNotifications();
          query.clear();
          useUI.getState().setActive(null);
        }
        if (next && alive && generation === authGeneration.current)
          setSession(next);
        if (next) {
          const result = await client().rpc("resolve_my_access_grants");
          if (result.error) throw new Error(result.error.message);
        }
        if (alive && generation === authGeneration.current) {
          previousUser.current = next?.user.id ?? null;
          setSession(next);
          const active = next
            ? await secureStorage.getItem(`active.${next.user.id}`)
            : null;
          useUI.getState().setActive(active);
        }
      } catch (e) {
        if(alive&&generation===authGeneration.current&&/EMAIL_NOT_VERIFIED|ACCOUNT_DELETION_PENDING/.test(e instanceof Error?e.message:String(e)))setSession(null);
        if (alive && generation === authGeneration.current)
          setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive && generation === authGeneration.current) setLoading(false);
      }
    };
    void supabase.auth.getSession().then(({ data, error: err }) => {
      if (err) {
        setError(err.message);
        setLoading(false);
      } else void apply(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      setTimeout(() => {
        void apply(next);
      }, 0);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      subscription.remove();
    };
  }, [attempt, query, development]);
  useEffect(
    () =>
      useUI.subscribe((state) => {
        if (session)
          void secureStorage
            .setItem(`active.${session.user.id}`, state.active ?? "")
            .catch((e) => setError(String(e)));
      }),
    [session],
  );
  const signOut = async () => {
    cancelSynchronization();
    const user =
      session?.user.id ?? (development ? DEVELOPMENT_USER : undefined);
    await query.cancelQueries();
    await clearDeviceNotifications();
    if (user) {
      await clearUserData(user);
      await clearOperations(user);
      await removeUserLocal(user);
      await secureStorage.removeItem(`active.${user}`);
    }
    if (!development) {
      const { error: err } = await client().auth.signOut();
      if (err) throw err;
    }
    setDevelopment(false);
    query.clear();
    useUI.getState().setActive(null);
    setSession(null);
  };
  return (
    <Context.Provider
      value={{
        session,
        development,
        startDevelopment: async () => {
          requireDevelopment();
          cancelSynchronization();
          await query.cancelQueries();
          query.clear();
          setError(null);
          setLoading(false);
          setSession(null);
          useUI.getState().setActive(null);
          setDevelopment(true);
        },
        loading,
        error,
        retry: () => setAttempt((v) => v + 1),
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession(){const state=useContext(Context);if(!state)throw new Error("SessionProvider is unavailable");return state;}

export function useAccountId() {
  const { session, development } = useSession();
  return session?.user.id ?? (development ? DEVELOPMENT_USER : null);
}
