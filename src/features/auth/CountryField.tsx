import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppText } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { profileCountries, profileCountryLabel } from "./countries";
export function CountryField({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const colors = useTheme();
  const matches = profileCountries.filter((country) =>
    `${country.name} ${country.code}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <View style={{ gap: 6 }}>
      <AppText>{t("profileCountry")}</AppText>
      <View
        style={{
          minHeight: 52,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <TextInput
          ref={input}
          accessibilityLabel={t("profileCountry")}
          editable={!disabled}
          value={open ? search : profileCountryLabel(value)}
          placeholder={t("countrySearch")}
          placeholderTextColor={colors.muted}
          onFocus={() => {
            setSearch("");
            setLimit(50);
            setOpen(true);
          }}
          onChangeText={(text) => {
            setSearch(text);
            setLimit(50);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            minHeight: 50,
            paddingHorizontal: 14,
            color: colors.ink,
            fontSize: 16,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? t("closePopup") : t("countrySearch")}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => {
            if (open) input.current?.blur();
            setSearch("");
            setLimit(50);
            setOpen(!open);
          }}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.muted}
          />
        </Pressable>
      </View>
      {open && (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          style={{
            height: 200,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 14,
            backgroundColor: colors.surface,
          }}
        >
          {!!value && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange(null);
                setOpen(false);
                input.current?.blur();
              }}
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: colors.primary }}>{t("clearCountry")}</Text>
            </Pressable>
          )}
          {!matches.length && (
            <Text style={{ color: colors.muted, padding: 14 }}>
              {t("countryNoResults")}
            </Text>
          )}
          {matches.slice(0, limit).map((country) => (
            <Pressable
              key={country.code}
              accessibilityRole="radio"
              accessibilityState={{ checked: country.code === value }}
              onPress={() => {
                onChange(country.code);
                setOpen(false);
                input.current?.blur();
              }}
              style={{
                minHeight: 48,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor:
                  country.code === value ? colors.background : colors.surface,
              }}
            >
              <Text style={{ flex: 1, color: colors.ink, fontSize: 14 }}>
                {country.name}
              </Text>
              {country.code === value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
          {matches.length > limit && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setLimit((current) => current + 50)}
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: colors.primary }}>{t("countryMore")}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}
