import { createContext, useContext } from "react";
export const DrawerContext = createContext<{
  open: () => void;
  close: () => void;
  visible: boolean;
} | null>(null);
export function useOptionalMoreDrawer() {
  return useContext(DrawerContext);
}
export function useMoreDrawer() {
  const drawer = useOptionalMoreDrawer();
  if (!drawer) throw new Error("MoreDrawerProvider missing");
  return drawer;
}
