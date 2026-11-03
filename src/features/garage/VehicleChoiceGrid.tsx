import { useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useTheme } from "@/src/lib/theme";

type Option = { id: string; label: string; image: ImageSourcePropType };

/** Measure the available container, rather than the device, for split-screen/web. */
export function VehicleChoiceGrid({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const columns =
    width >= 540 && fontScale < 1.5
      ? 3
      : width < 260 || fontScale >= 1.8
        ? 1
        : 2;
  const cardWidth =
    width > 0 ? (width - (columns - 1) * 10) / columns : undefined;
  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "stretch",
      }}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => ({
              width: cardWidth,
              minWidth: 0,
              padding: 6,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: selected ? colors.accent : colors.line,
              backgroundColor: colors.surface,
              opacity: disabled ? 0.6 : pressed ? 0.75 : 1,
            })}
          >
            <Image
              source={option.image}
              resizeMode="contain"
              accessible={false}
              style={{ width: "100%", aspectRatio: 1, borderRadius: 10 }}
            />
            <View
              style={{
                minHeight: 44,
                paddingHorizontal: 2,
                paddingVertical: 6,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.ink,
                  textAlign: "center",
                  flexShrink: 1,
                }}
              >
                {selected ? "✓ " : ""}
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
