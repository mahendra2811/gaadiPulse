import { SquareArtwork } from "@/src/components/ui/SquareArtwork";
import { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
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
        alignItems: "flex-start",
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
              overflow: "hidden",
              borderRadius: 16,
              borderWidth: 2,
              borderColor: selected ? colors.accent : colors.line,
              backgroundColor: colors.surface,
              opacity: disabled ? 0.6 : pressed ? 0.75 : 1,
            })}
          >
            <SquareArtwork source={option.image} radius={0} />
            <View
              style={{
                // A square image + roughly 10% caption; grow for wrapped text.
                minHeight: Math.max(24, ((cardWidth ?? 160) - 4) / 9),
                paddingHorizontal: 6,
                paddingVertical: 3,
                borderTopWidth: 1,
                borderTopColor: colors.line,
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
