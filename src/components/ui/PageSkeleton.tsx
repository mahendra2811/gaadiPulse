import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";

type Shape =
  "home" | "records" | "rows" | "garage" | "dashboard" | "reading" | "amount";
export function PageSkeleton({ shape }: { shape: Shape }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0.7));
  useEffect(() => {
    if (reduced) {
      opacity.setValue(0.7);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.38,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.78,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduced]);
  const box = (height: number, width: `${number}%` = "100%", radius = 12) => (
    <View
      style={{ width, height, borderRadius: radius, backgroundColor: c.line }}
    />
  );
  const rows = (
    <View
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 18,
        backgroundColor: c.surface,
        gap: 16,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          {box(42, "15%", 12)}
          <View style={{ flex: 1, gap: 8 }}>
            {box(12, "65%")}
            {box(10, "40%")}
          </View>
          {box(15, "18%")}
        </View>
      ))}
    </View>
  );
  const vehicle = (
    <View
      style={{
        padding: 16,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 20,
        backgroundColor: c.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      {box(68, "24%", 14)}
      <View style={{ flex: 1, gap: 10 }}>
        {box(15, "70%")}
        {box(11, "48%")}
        {box(11, "38%")}
      </View>
    </View>
  );
  const tiles = (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 102,
            borderRadius: 18,
            backgroundColor: c.line,
          }}
        />
      ))}
    </View>
  );
  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("loading")}
      importantForAccessibility="yes"
      style={{ gap: 14, opacity }}
    >
      {shape === "home" && (
        <>
          {box(14, "35%")}
          {vehicle}
          {box(14, "45%")}
          <View
            style={{
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: 18,
              gap: 10,
            }}
          >
            {box(20, "30%")}
            {box(12, "60%")}
          </View>
          {box(14, "42%")}
          {tiles}
          {box(14, "38%")}
          {rows}
        </>
      )}
      {shape === "records" && (
        <>
          {vehicle}
          {box(18, "45%")}
          {box(52)}
          {box(94)}
          {box(48)}
          {rows}
        </>
      )}
      {shape === "rows" && rows}
      {shape === "garage" && (
        <>
          {box(16, "42%")}
          {tiles}
          {tiles}
        </>
      )}
      {shape === "dashboard" && (
        <>
          {box(14, "42%")}
          {tiles}
          {box(14, "38%")}
          {rows}
        </>
      )}
      {shape === "amount" && box(24, "70%")}
      {shape === "reading" && (
        <View
          style={{
            padding: 16,
            backgroundColor: c.surface,
            borderRadius: 18,
            gap: 10,
          }}
        >
          {box(20, "30%")}
          {box(12, "60%")}
        </View>
      )}
    </Animated.View>
  );
}
