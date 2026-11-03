import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { useTheme } from "@/src/lib/theme";
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
  const navigation = pageNavigation(path);
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
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: path === "/" ? c.background : c.surface,
        borderBottomWidth: path === "/" ? 0 : 1,
        borderBottomColor: c.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
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
      ) : (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: "#D9F5EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="pulse" size={25} color="#087565" />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        {sectionLabel && sectionLabel !== title && (
          <Text style={{ color: c.muted, fontSize: 12 }}>{sectionLabel}</Text>
        )}
        <Text
          accessibilityRole="header"
          style={{
            color: c.ink,
            fontSize: 24,
            lineHeight: 31,
            fontWeight: "800",
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}
