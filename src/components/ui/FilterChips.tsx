import { ScrollView, Pressable, Text } from "react-native";
import { useTheme } from "@/src/lib/theme";
export function FilterChips({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useTheme();
  return (
    <ScrollView
      style={{ flexGrow: 0 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 7, paddingVertical: 2 }}
      accessibilityRole="radiogroup"
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="radio"
          accessibilityLabel={item.label}
          accessibilityState={{ checked: value === item.id }}
          onPress={() => onChange(item.id)}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: value === item.id ? c.primary : c.surface,
            borderWidth: 1,
            borderColor: value === item.id ? c.primary : c.line,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              color: value === item.id ? c.background : c.ink,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
