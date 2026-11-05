import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Popup } from "@/src/components/ui/Popup";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { profileIcons, type ProfileIcon } from "./avatars";

export function ProfileIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: ProfileIcon;
  onChange: (icon: ProfileIcon) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const colors = useTheme();
  return (
    <>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chooseProfileIcon")}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={{
            width: 76,
            height: 76,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.line,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Ionicons name={value} size={40} color={colors.primary} />
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          {t("chooseProfileIcon")}
        </Text>
      </View>
      <Popup
        visible={open}
        onClose={() => setOpen(false)}
        title={t("chooseProfileIcon")}
      >
        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {profileIcons.map((icon) => (
            <Pressable
              key={icon}
              accessibilityRole="radio"
              accessibilityLabel={icon.replaceAll("-", " ")}
              accessibilityState={{ checked: value === icon }}
              onPress={() => {
                onChange(icon);
                setOpen(false);
              }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.background,
                borderWidth: value === icon ? 2 : 1,
                borderColor: value === icon ? colors.primary : colors.line,
              }}
            >
              <Ionicons name={icon} size={27} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      </Popup>
    </>
  );
}
