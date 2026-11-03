import { Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

/** Constrain bundled artwork independently of its intrinsic pixel dimensions. */
export function SquareArtwork({
  source,
  size,
  radius = 14,
}: {
  source: ImageSourcePropType;
  size?: number;
  radius?: number;
}) {
  return (
    <View
      style={{
        width: size ?? "100%",
        aspectRatio: 1,
        flexShrink: 0,
        borderRadius: radius,
        overflow: "hidden",
      }}
    >
      <Image
        source={source}
        resizeMode="contain"
        accessible={false}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
      />
    </View>
  );
}
