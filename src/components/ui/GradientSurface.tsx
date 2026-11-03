import { useId, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
export function GradientSurface({
  children,
  colors = ["#0D584E", "#167D75", "#1D7087"],
  style,
}: {
  children: ReactNode;
  colors?: readonly [string, string, string];
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View
      style={[
        {
          borderRadius: 28,
          backgroundColor: colors[0],
          shadowColor: "#0B403B",
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 18,
          elevation: 5,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: 28,
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="90%">
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="0.55" stopColor={colors[1]} />
              <Stop offset="1" stopColor={colors[2]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}
