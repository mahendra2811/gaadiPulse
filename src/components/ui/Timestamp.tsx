import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { displayDateTime } from "@/src/utils/dateDisplay";
import { t } from "@/src/lib/i18n";
export function Timestamp({
  value,
  timezone,
  label,
  compact = false,
}: {
  value?: string | null;
  timezone?: string;
  label?: string;
  compact?: boolean;
}) {
  const c = useTheme();
  const date = displayDateTime(value, timezone);
  if (compact) {
    const shortDate = date.date.replace(/,?\s+\d{4}$/, "");
    const shortTime = date.time.replace(/\s?([AP])M$/i, "$1");
    return (
      <Text
        accessibilityLabel={`${label ?? ""} ${date.date} ${date.time} ${date.zone ?? ""}`}
        numberOfLines={1}
        style={{
          color: c.muted,
          fontSize: 11,
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {[shortDate, shortTime].filter(Boolean).join(" · ")}
      </Text>
    );
  }
  return (
    <View
      accessibilityLabel={`${label ?? ""} ${date.date} ${date.time} ${date.zone ?? ""}`}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 9,
        rowGap: 4,
      }}
    >
      {label && (
        <Text style={{ fontSize: 11, color: c.muted, fontWeight: "600" }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Ionicons name="calendar-outline" size={13} color={c.muted} />
        <Text style={{ fontSize: 12, color: c.muted }}>{date.date}</Text>
      </View>
      {!!date.time && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons name="time-outline" size={13} color={c.muted} />
          <Text style={{ fontSize: 12, color: c.muted }}>{date.time}</Text>
        </View>
      )}
    </View>
  );
}
export function TimestampRange({
  from,
  to,
  timezone,
}: {
  from: string;
  to: string;
  timezone?: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Timestamp label={t("timestampFrom")} value={from} timezone={timezone} />
      <Timestamp label={t("timestampTo")} value={to} timezone={timezone} />
    </View>
  );
}
