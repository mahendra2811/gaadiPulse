import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppText } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { availableTimezones, timezoneLabel } from "./timezone";

export function TimezoneField({
  value,
  onChange,
  disabled,
  error,
  account = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  account?: boolean;
}) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const colors = useTheme();
  const options = useMemo(
    () =>
      availableTimezones(value).map((zone) => ({
        zone,
        label: timezoneLabel(zone),
      })),
    [value]
  );
  const filtered = options.filter(({ zone, label }) =>
    `${zone} ${label}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <View style={{ gap: 6 }}>
      <AppText>{t(account ? "accountTimezone" : "timezoneOptional")}</AppText>
      <View
        style={{
          minHeight: 52,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.line,
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={t("timezoneSearch")}
          editable={!disabled}
          value={open ? search : timezoneLabel(value)}
          placeholder={t("timezoneSearch")}
          placeholderTextColor={colors.muted}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onChangeText={setSearch}
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
          accessibilityLabel={open ? t("closePopup") : t("timezoneSearch")}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => {
            setSearch("");
            if (open) inputRef.current?.blur();
            setOpen(!open);
          }}
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
        </Pressable>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
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
          {!filtered.length && (
            <Text style={{ color: colors.muted, padding: 14 }}>{t("timezoneNoResults")}</Text>
          )}
          {filtered.map(({ zone, label }) => (
            <Pressable
              key={zone}
              accessibilityRole="radio"
              accessibilityState={{ checked: zone === value }}
              onPress={() => {
                onChange(zone);
                setOpen(false);
                inputRef.current?.blur();
              }}
              style={{
                minHeight: 48,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: zone === value ? colors.background : colors.surface,
              }}
            >
              <Text style={{ flex: 1, color: colors.ink, fontSize: 14 }}>{label}</Text>
              {zone === value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
