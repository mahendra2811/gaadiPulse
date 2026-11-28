import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/src/components/ui/PageSkeleton";
import { Screen } from "@/src/components/ui";
import { hasSeenFirstRunIntro } from "@/src/features/auth/firstRun";
import { useSession } from "@/src/features/auth/session";
import { t } from "@/src/lib/i18n";

export default function Index() {
  const auth = useSession();
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    let active = true;
    void hasSeenFirstRunIntro().then((seen) => {
      if (active) setIntroSeen(seen);
    });
    return () => {
      active = false;
    };
  }, [auth.loading]);

  if (auth.loading || introSeen === null)
    return (
      <Screen title={t("loading")} compact>
        <PageSkeleton shape="rows" />
      </Screen>
    );
  if (auth.session || auth.development) return <Redirect href="/(tabs)" />;
  return <Redirect href={introSeen ? "/auth/login" : "/auth/welcome"} />;
}
