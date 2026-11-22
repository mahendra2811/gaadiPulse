import { useProfile } from "@/src/features/auth/profile";
import {
  getLocale,
  setLocale,
  subscribeLocale,
  supportedLocales,
  t,
  type SupportedLocale,
} from "@/src/lib/i18n";
import { useSyncExternalStore } from "react";
export function useLocale() {
  const profile = useProfile();
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return {
    locale: (profile.data?.locale as SupportedLocale | undefined) ?? locale,
    t,
    setLocale,
    availableLocales: supportedLocales,
  };
}

/** Root-level subscription used so existing screens that call t() directly rerender. */
export function useLocaleSubscription() {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}
