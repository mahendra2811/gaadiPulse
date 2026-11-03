import { useEffect, useState, type ReactNode, type ComponentProps } from "react";
import { Animated, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { AppText } from "./index";
export type IconName = ComponentProps<typeof Ionicons>["name"];
export const iconTones = {
  mint: { ink: "#087565", background: "#D9F5EB" },
  blue: { ink: "#3157BF", background: "#E5ECFF" },
  amber: { ink: "#9B5A0A", background: "#FFF0D1" },
  violet: { ink: "#7750B7", background: "#F0E7FF" },
  coral: { ink: "#B44752", background: "#FFE7E8" },
  cyan: { ink: "#087B91", background: "#DDF5FA" },
} as const;
export type IconTone = keyof typeof iconTones;
export function ColorIcon({
  name,
  tone = "mint",
  size = 22,
}: {
  name: IconName;
  tone?: IconTone;
  size?: number;
}) {
  const color = iconTones[tone];
  return (
    <View
      style={{
        width: size + 22,
        height: size + 22,
        borderRadius: 16,
        backgroundColor: color.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size} color={color.ink} />
    </View>
  );
}
export { GradientSurface } from "./GradientSurface";
import { GradientSurface } from "./GradientSurface";
export function MotionPress({
  children,
  onPress,
  label,
  style,
  disabled = false,
  expanded,
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  expanded?: boolean;
}) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (toValue: number) => {
    if (!reduced)
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        speed: 35,
        bounciness: 0,
      }).start();
  };
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          disabled,
          ...(expanded === undefined ? {} : { expanded }),
        }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => ({
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        })}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
export function TextAction({
  label,
  onPress,
  light = false,
  icon = "arrow-forward",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  light?: boolean;
  icon?: IconName;
  disabled?: boolean;
}) {
  const c = useTheme();
  const color = light ? "#FFFFFF" : c.primary;
  return (
    <MotionPress label={label} onPress={onPress} disabled={disabled}>
      <View
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ color, fontSize: 14, fontWeight: "700", flexShrink: 1 }}>{label}</Text>
        <Ionicons name={icon} size={16} color={color} />
      </View>
    </MotionPress>
  );
}
export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText large>{title}</AppText>
      </View>
      {action && onAction && <TextAction label={action} onPress={onAction} />}
    </View>
  );
}
export function ActionTile({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: IconName;
  tone: IconTone;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <MotionPress label={label} onPress={onPress} style={{ flexBasis: "45%", flexGrow: 1 }}>
      <View
        style={{
          minHeight: 106,
          padding: 14,
          borderRadius: 22,
          backgroundColor: c.surface,
          gap: 10,
          shadowColor: "#13283C",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <ColorIcon name={icon} tone={tone} />
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: c.ink,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
      </View>
    </MotionPress>
  );
}
export function MenuRow({
  label,
  subtitle,
  icon,
  tone = "mint",
  onPress,
}: {
  label: string;
  subtitle?: string;
  icon: IconName;
  tone?: IconTone;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <MotionPress label={label} onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 64,
          paddingVertical: 8,
        }}
      >
        <ColorIcon name={icon} tone={tone} />
        <View style={{ flex: 1, gap: 3 }}>
          <AppText>{label}</AppText>
          {subtitle && <AppText muted>{subtitle}</AppText>}
        </View>
        <Ionicons name="chevron-forward" size={17} color={c.muted} />
      </View>
    </MotionPress>
  );
}
export function GradientButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPress label={label} onPress={onPress} disabled={disabled}>
      <GradientSurface style={{ borderRadius: 18, shadowOpacity: 0.12, elevation: 3 }}>
        <View
          style={{
            minHeight: 52,
            paddingHorizontal: 18,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "700",
              flexShrink: 1,
            }}
          >
            {label}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </View>
      </GradientSurface>
    </MotionPress>
  );
}
export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <MotionPress label={label} onPress={onPress}>
      <View
        style={{
          minHeight: 44,
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: selected ? c.primary : c.line,
          backgroundColor: selected ? c.primary : c.surface,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: selected ? c.background : c.ink,
          }}
        >
          {label}
        </Text>
      </View>
    </MotionPress>
  );
}

export function Expandable({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(expanded ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: reduced ? 0 : 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, reduced, progress]);
  return (
    <Animated.View
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      style={{
        display: expanded ? "flex" : "none",
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function InfoRows({ items }: { items: { label: string; value: string }[] }) {
  const c = useTheme();
  return (
    <View>
      {items.map((item, index) => (
        <View
          key={`${item.label}.${index}`}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            paddingVertical: 11,
            borderTopWidth: index ? 1 : 0,
            borderTopColor: c.line,
          }}
        >
          <Text
            style={{
              color: c.muted,
              fontSize: 13,
              flexBasis: "38%",
              flexGrow: 1,
            }}
          >
            {item.label}
          </Text>
          <Text
            selectable
            style={{
              color: c.ink,
              fontSize: 14,
              fontWeight: "600",
              flexBasis: "50%",
              flexGrow: 1,
              textAlign: "right",
            }}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
