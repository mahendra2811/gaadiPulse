import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppText } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import {
  currencyOptions,
  currencyLabel,
  type CurrencyCode,
} from "@/src/utils/currency";

export function CurrencyField({
  value,
  onChange,
  disabled,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const colors = useTheme();
  const matches = currencyOptions.filter((currency) =>
    `${currency.code} ${currency.name} ${currency.symbol}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <View style={{ gap: 6 }}>
      <AppText>{t("currency")}</AppText>
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
          accessibilityLabel={t("currency")}
          editable={!disabled}
          value={open ? search : currencyLabel(value)}
          placeholder={t("currencySearch")}
          placeholderTextColor={colors.muted}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onChangeText={setSearch}
          autoCapitalize="characters"
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
          accessibilityLabel={open ? t("closePopup") : t("currencySearch")}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => {
            setSearch("");
            if (open) input.current?.blur();
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
            height: 220,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 14,
            backgroundColor: colors.surface,
          }}
        >
          {!matches.length && (
            <Text style={{ color: colors.muted, padding: 14 }}>
              {t("currencyNoResults")}
            </Text>
          )}
          {matches.map((currency) => (
            <Pressable
              key={currency.code}
              accessibilityRole="radio"
              accessibilityState={{ checked: currency.code === value }}
              onPress={() => {
                onChange(currency.code);
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
                  currency.code === value ? colors.background : colors.surface,
              }}
            >
              <Text style={{ color: colors.ink, width: 44, fontWeight: "700" }}>
                {currency.code}
              </Text>
              <Text style={{ flex: 1, color: colors.ink, fontSize: 14 }}>
                {currency.name} ({currency.symbol})
              </Text>
              {currency.code === value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
