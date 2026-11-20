import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";

type Format = "json" | "csv" | "pdf";
const formats = [
  {
    id: "json",
    label: "JSON",
    icon: "code-slash-outline",
  },
  {
    id: "csv",
    label: "CSV",
    icon: "grid-outline",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: "document-text-outline",
  },
] as const;
export function ExportActions({
  disabled,
  onExport,
}: {
  disabled: boolean;
  onExport: (format: Format) => void;
}) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {formats.map((format) => (
        <Pressable
          key={format.id}
          accessibilityRole="button"
          accessibilityLabel={`Export ${format.label}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onExport(format.id)}
          style={({ pressed }) => ({
            flexBasis: 80,
            flexGrow: 1,
            minWidth: 0,
            opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              minHeight: 88,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              paddingVertical: 14,
              paddingHorizontal: 4,
            }}
          >
            <Ionicons name={format.icon} color={colors.primary} size={25} />
            <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 14 }}>
              {format.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
