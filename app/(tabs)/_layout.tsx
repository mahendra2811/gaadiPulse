import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
const names = ["index", "fuel", "expenses", "more"] as const;
const labels = ["home", "fuel", "expenses", "more"] as const;
const icons = [
  "home-outline",
  "water-outline",
  "receipt-outline",
  "grid-outline",
] as const;
export default function TabLayout() {
  const c = useTheme();
  const inset = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, emitter, navigateToTab }) => (
        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: inset.bottom + 12,
            minHeight: 72,
            padding: 8,
            borderRadius: 26,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            flexDirection: "row",
            gap: 4,
          }}
        >
          {state.routes.map((route, index) => {
            const selected = state.index === index;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={t(labels[index])}
                accessibilityState={{ selected }}
                onPress={() => {
                  const event = emitter.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!selected && !event.defaultPrevented)
                    navigateToTab(route.key);
                }}
                style={{
                  flex: 1,
                  minHeight: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 19,
                  backgroundColor: selected ? c.background : "transparent",
                  gap: 4,
                  padding: 4,
                }}
              >
                <Ionicons
                  name={icons[index]}
                  color={selected ? c.primary : c.muted}
                  size={22}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: selected ? c.primary : c.muted,
                    fontWeight: selected ? "700" : "400",
                  }}
                >
                  {t(labels[index])}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    >
      {names.map((name, i) => (
        <Tabs.Screen key={name} name={name} options={{ title: t(labels[i]) }} />
      ))}
    </Tabs>
  );
}
