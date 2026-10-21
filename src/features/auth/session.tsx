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
  loading: boolean;
  error: string | null;
  retry: () => void;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthState>({
  session: null,
  loading: true,
  error: null,
  retry: () => {},
  signOut: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const authGeneration = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const apply = async (next: Session | null) => {
      const generation = ++authGeneration.current;
      setLoading(true);
      setError(null);
      try {
        if (previousUser.current && previousUser.current !== next?.user.id) {
          await query.cancelQueries();
          await clearUserData(previousUser.current);
          query.clear();
          useUI.getState().setActive(null);
        }
        if (next) {
          const result = await client().rpc("resolve_my_access_grants");
          if (result.error) throw result.error;
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
  }, [attempt, query]);
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
    const user = session?.user.id;
    await query.cancelQueries();
    if (user) {
      await clearUserData(user);
      await secureStorage.removeItem(`active.${user}`);
    }
    const { error: err } = await client().auth.signOut();
    if (err) throw err;
    query.clear();
    useUI.getState().setActive(null);
    setSession(null);
  };
  return (
    <Context.Provider
      value={{
        session,
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
export const useSession = () => useContext(Context);
