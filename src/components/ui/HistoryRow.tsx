import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MotionPress } from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { r } from "@/src/features/records/copy";

export function HistoryRow({
  primary,
  detail,
  secondary,
  date,
  status,
  separated,
  onPress,
}: {
  primary: string;
  detail?: string;
  secondary: string;
  date: string;
  status?: string;
  separated?: boolean;
  onPress?: () => void;
}) {
  const c = useTheme();
  const content = (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 6,
        minHeight: 64,
        borderTopWidth: separated ? 1 : 0,
        borderTopColor: c.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: c.primary, fontWeight: "700", fontSize: 19 }}>
            {primary}
            {detail ? (
              <Text
                style={{ color: c.ink, fontWeight: "500", fontSize: 15 }}
              >{` (${detail})`}</Text>
            ) : null}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: c.primary, fontSize: 11, fontWeight: "600" }}>{secondary}</Text>
            {status && <Text style={{ color: c.muted, fontSize: 11 }}>{status}</Text>}
            <Text
              style={{
                color: c.muted,
                fontSize: 11,
                lineHeight: 16,
                marginLeft: "auto",
                flexShrink: 1,
              }}
            >
              {date}
            </Text>
          </View>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={20} color={c.primary} />}
      </View>
    </View>
  );
  return onPress ? (
    <MotionPress
      label={`${r("detail")}: ${primary}, ${detail ?? ""}, ${secondary}, ${date}${status ? `, ${status}` : ""}`}
      onPress={onPress}
    >
      {content}
    </MotionPress>
  ) : (
    content
  );
}
