import { useState } from "react";
import { Pressable, View, type TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { InputField } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

export function PasswordField({
  label,
  ...props
}: TextInputProps & { label: string; required?: boolean }) {
  const [visible, setVisible] = useState(false);
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <InputField {...props} label={label} secureTextEntry={!visible} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t(visible ? "hidePassword" : "showPassword")}: ${label}`}
        accessibilityState={{ disabled: props.editable === false }}
        disabled={props.editable === false}
        onPress={() => setVisible((value) => !value)}
        style={({ pressed }) => ({
          width: 52,
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          opacity: props.editable === false ? 0.45 : pressed ? 0.65 : 1,
        })}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={c.primary}
        />
      </Pressable>
    </View>
  );
}
