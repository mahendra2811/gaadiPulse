import { Pressable, Text, View } from "react-native";
import { AppText } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { t, type SupportedLocale } from "@/src/lib/i18n";

const options: readonly [SupportedLocale, string][] = [
  ["en-IN", "localeEnglish"],
];

export function LocaleField({
  value,
  onChange,
  disabled,
}: {
  value: SupportedLocale;
  onChange: (value: SupportedLocale) => void;
  disabled: boolean;
}) {
  const colors = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText>{t("language")}</AppText>
      <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
        {options.map(([locale, labelKey]) => (
          <Pressable
            key={locale}
            accessibilityRole="radio"
            accessibilityLabel={t(labelKey as "localeEnglish")}
            accessibilityState={{ checked: value === locale, disabled }}
            disabled={disabled}
            onPress={() => onChange(locale)}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: value === locale ? colors.primary : colors.line,
              borderRadius: 12,
              backgroundColor: colors.surface,
              opacity: disabled ? 0.45 : 1,
            }}
          >
            <Text style={{ color: colors.ink, flex: 1 }}>
              {t(labelKey as "localeEnglish")}
            </Text>
            <Text
              style={{
                color: value === locale ? colors.primary : colors.muted,
                fontSize: 20,
              }}
            >
              {value === locale ? "●" : "○"}
            </Text>
          </Pressable>
        ))}
      </View>
      <AppText muted>{t("localeHint")}</AppText>
    </View>
  );
}
