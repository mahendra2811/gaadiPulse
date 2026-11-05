import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GradientSurface } from "@/src/components/ui/GradientSurface";

type Format = "json" | "csv" | "pdf";
const formats = [
  {
    id: "json",
    label: "JSON",
    icon: "code-slash-outline",
    colors: ["#3555AA", "#4F62BD", "#6955AD"],
  },
  {
    id: "csv",
    label: "CSV",
    icon: "grid-outline",
    colors: ["#086B5C", "#12816A", "#15957B"],
  },
  {
    id: "pdf",
    label: "PDF",
    icon: "document-text-outline",
    colors: ["#A13E4C", "#B94C55", "#CE6A58"],
  },
] as const;
export function ExportActions({
  disabled,
  onExport,
}: {
  disabled: boolean;
  onExport: (format: Format) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {formats.map((format) => (
        <Pressable
          key={format.id}
          accessibilityRole="button"
          accessibilityLabel={`Export ${format.label}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onExport(format.id)}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          })}
        >
          <GradientSurface
            colors={format.colors}
            style={{
              minHeight: 104,
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              paddingVertical: 14,
              paddingHorizontal: 4,
              shadowOpacity: 0,
              elevation: 0,
            }}
          >
            <Ionicons name={format.icon} color="#FFFFFF" size={30} />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
              {format.label}
            </Text>
          </GradientSurface>
        </Pressable>
      ))}
    </View>
  );
}
