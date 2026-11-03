import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
export function SearchField({
  value,
  onChange,
  label = t("search"),
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 50,
        paddingLeft: 14,
        paddingRight: 4,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: focused ? c.primary : c.line,
        backgroundColor: c.surface,
        gap: 10,
      }}
    >
      <Ionicons name="search" size={20} color={c.muted} />
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          color: c.ink,
          paddingVertical: 13,
        }}
      />
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("uiClearSearch")}
          onPress={() => onChange("")}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close-circle" size={20} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}
