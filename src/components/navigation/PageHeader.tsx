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
    <View style={{ paddingHorizontal: 20, paddingVertical: 10, gap: 4 }}>
      {(navigation.back || onBack) && (
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
            minHeight: 48,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingRight: 16,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={24} color={c.primary} />
          <Text style={{ color: c.primary, fontSize: 16, fontWeight: "600" }}>
            {t("back")}
          </Text>
        </Pressable>
      )}
      {sectionLabel && sectionLabel !== title && (
        <Text style={{ color: c.muted, fontSize: 14 }}>
          {sectionLabel} › {title}
        </Text>
      )}
      <Text
        accessibilityRole="header"
        style={{
          color: c.ink,
          fontSize: 28,
          lineHeight: 36,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </View>
  );
}
