import { useEffect, useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { GradientSurface } from "@/src/components/ui/GradientSurface";
import { useOptionalMoreDrawer } from "./DrawerContext";
export type NavigationTab = "index" | "fuel" | "expenses" | "more";
const items = [
  {
    id: "index",
    label: "home",
    icon: "home",
    ink: "#087565",
    background: "#D9F5EB",
  },
  {
    id: "fuel",
    label: "fuel",
    icon: "water",
    ink: "#3157BF",
    background: "#E5ECFF",
  },
  {
    id: "expenses",
    label: "expenses",
    icon: "receipt",
    ink: "#9B5A0A",
    background: "#FFF0D1",
  },
  {
    id: "more",
    label: "more",
    icon: "menu",
    ink: "#7750B7",
    background: "#F0E7FF",
  },
] as const;
export function hasBrowseNavigation(path: string) {
  if (
    path.startsWith("/auth") ||
    path === "/garage/add" ||
    path === "/garage/edit" ||
    path === "/owner/form-builder" ||
    path === "/settings/profile" ||
    path === "/settings/security"
  )
    return false;
  if (/^\/records\/[^/]+\/(add|edit)(\/|$)/.test(path)) return false;
  return (
    path === "/garage" ||
    path.startsWith("/garage/") ||
    path.startsWith("/records/") ||
    path === "/reports" ||
    path === "/maintenance" ||
    path === "/meters/history" ||
    path.startsWith("/settings") ||
    path === "/owner/members" ||
    path === "/progress/approvals"
  );
}
export function FloatingNavigation({
  selected,
  onSelect,
}: {
  selected?: NavigationTab;
  onSelect?: (tab: NavigationTab) => void;
}) {
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const path = usePathname();
  const drawer = useOptionalMoreDrawer();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboard(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (!drawer || keyboard) return null;
  const current = drawer.visible
    ? "more"
    : (selected ??
      (path.includes("/fuel")
        ? "fuel"
        : path.includes("/expenses")
          ? "expenses"
          : "more"));
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: inset.bottom + 12,
        minHeight: 76,
        padding: 7,
        borderRadius: 28,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        flexDirection: "row",
        gap: 4,
        shadowColor: "#0B2636",
        shadowOpacity: 0.14,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        elevation: 10,
      }}
    >
      {items.map((item) => {
        const active = current === item.id;
        const body = (
          <View
            style={{
              minHeight: 56,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: 5,
            }}
          >
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 11,
                backgroundColor: active ? "transparent" : item.background,
              }}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={active ? "#FFF" : item.ink}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                color: active ? "#FFF" : c.muted,
                fontWeight: active ? "700" : "500",
              }}
            >
              {t(item.label)}
            </Text>
          </View>
        );
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={t(item.label)}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (onSelect) {
                onSelect(item.id);
                return;
              }
              if (item.id === "more") {
                drawer.open();
                return;
              }
              router.navigate(
                item.id === "index"
                  ? "/(tabs)"
                  : item.id === "fuel"
                    ? "/(tabs)/fuel"
                    : "/(tabs)/expenses",
              );
            }}
            style={({ pressed }) => ({
              flex: 1,
              borderRadius: 21,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            {active ? (
              <GradientSurface
                style={{ borderRadius: 21, elevation: 0, shadowOpacity: 0 }}
              >
                {body}
              </GradientSurface>
            ) : (
              body
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
