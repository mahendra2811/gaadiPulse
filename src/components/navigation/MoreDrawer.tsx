import { useCallback, useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { Popup } from "@/src/components/ui/Popup";
import { MoreMenu } from "@/src/features/navigation/MoreMenu";
import { t } from "@/src/lib/i18n";
import { DrawerContext, useMoreDrawer } from "./DrawerContext";
export { useMoreDrawer } from "./DrawerContext";
export function MoreDrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  return (
    <DrawerContext.Provider value={{ open, close, visible }}>
      {children}
      <Popup visible={visible} onClose={close} title={t("more")}>
        <MoreMenu
          navigate={(href) => {
            close();
            router.push(href);
          }}
        />
      </Popup>
    </DrawerContext.Provider>
  );
}
export function MoreDrawerRoute() {
  const { open } = useMoreDrawer();
  useEffect(() => {
    router.replace("/(tabs)");
    open();
  }, [open]);
  return null;
}
