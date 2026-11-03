import { Tabs } from "expo-router";
import { FloatingNavigation, type NavigationTab } from "./FloatingNavigation";
import { useMoreDrawer } from "./DrawerContext";
import { t } from "@/src/lib/i18n";
const names = ["index", "fuel", "expenses", "more"] as const;
const labels = ["home", "fuel", "expenses", "more"] as const;
export default function TabLayout() {
  const drawer = useMoreDrawer();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, emitter, navigateToTab }) => (
        <FloatingNavigation
          selected={state.routes[state.index]?.name as NavigationTab}
          onSelect={(name) => {
            const route = state.routes.find((route) => route.name === name);
            if (!route) return;
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;
            if (name === "more") drawer.open();
            else if (state.routes[state.index]?.key !== route.key)
              navigateToTab(route.key);
          }}
        />
      )}
    >
      {names.map((name, index) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: t(labels[index]) }}
        />
      ))}
    </Tabs>
  );
}
