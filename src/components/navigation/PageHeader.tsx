import { HeaderVehicleSwitcher } from "./HeaderVehicleSwitcher";
import { Image, Pressable, Text, View, useColorScheme } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { resolveTheme, useTheme, useThemeMode } from "@/src/lib/theme";
import { artwork } from "@/src/lib/assets";
import { t } from "@/src/lib/i18n";
import { r } from "@/src/features/records/copy";
import { pageNavigation } from "./routes";

export function PageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  const c = useTheme();
  const dark = resolveTheme(useThemeMode(), useColorScheme()) === "dark";
  const navigation = pageNavigation(path);
  const brandHeader =
    path === "/" && title === t("app") && !navigation.back && !onBack;
  const section = navigation.section;
  const sectionLabel = section
    ? ["garage", "settings", "more"].includes(section)
      ? t(section as "garage" | "settings" | "more")
      : r(
          section as
            | "fuel"
            | "expenses"
            | "meters"
            | "progress"
            | "documents"
            | "reminders",
        )
    : undefined;
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: path === "/" ? c.background : c.surface,
        borderBottomWidth: path === "/" ? 0 : 1,
        borderBottomColor: c.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {navigation.back || onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={
            onBack ??
            (() => {
              if (router.canGoBack()) router.back();
              else router.replace(navigation.fallback);
            })
          }
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.surface,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={23} color={c.primary} />
        </Pressable>
      ) : brandHeader ? (
        <Image
          accessibilityLabel={t("app")}
          source={dark ? artwork.wordmarkDark : artwork.wordmarkLight}
          resizeMode="contain"
          style={{ width: 158, height: 44 }}
        />
      ) : (
        <Image
          accessibilityLabel={t("app")}
          source={artwork.logoCircle}
          resizeMode="contain"
          style={{ width: 42, height: 42 }}
        />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {sectionLabel && sectionLabel !== title && (
          <Text style={{ color: c.muted, fontSize: 12 }}>{sectionLabel}</Text>
        )}
        {!brandHeader && (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="header"
            style={{
              color: c.ink,
              fontSize: 20,
              lineHeight: 27,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>
        )}
      </View>
      {!path.startsWith("/auth") && <HeaderVehicleSwitcher />}
    </View>
  );
}
