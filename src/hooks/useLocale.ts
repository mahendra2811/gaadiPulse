import { useProfile } from "@/src/features/auth/profile";
import { t } from "@/src/lib/i18n";
export function useLocale() {
  const profile = useProfile();
  return {
    locale: profile.data?.locale ?? "en",
    t,
    availableLocales: ["en"] as const,
  };
}
