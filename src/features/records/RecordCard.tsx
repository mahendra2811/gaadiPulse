import { Timestamp } from "@/src/components/ui/Timestamp";
import { readableDateTime } from "@/src/utils/dateDisplay";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Card } from "@/src/components/ui";
import {
  ColorIcon,
  GradientSurface,
  MotionPress,
  type IconName,
  type IconTone,
} from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { money } from "@/src/utils/money";
import { r, recordCopy } from "./copy";
import type { Kind, RecordEntry } from "./schema";
export const recordVisuals: Record<
  Kind,
  { icon: IconName; tone: IconTone; colors: readonly [string, string, string] }
> = {
  fuel: {
    icon: "water",
    tone: "blue",
    colors: ["#294A87", "#3764A1", "#2B688D"],
  },
  expenses: {
    icon: "receipt",
    tone: "amber",
    colors: ["#78501E", "#96612C", "#92532F"],
  },
  meters: {
    icon: "speedometer",
    tone: "cyan",
    colors: ["#155B6D", "#247589", "#2B688D"],
  },
  progress: {
    icon: "checkbox",
    tone: "violet",
    colors: ["#4E3D7B", "#685295", "#5965A2"],
  },
  documents: {
    icon: "documents",
    tone: "amber",
    colors: ["#78501E", "#96612C", "#92532F"],
  },
  reminders: {
    icon: "notifications",
    tone: "coral",
    colors: ["#813F54", "#9D4B61", "#87527C"],
  },
};
export function recordTimestamp(row: RecordEntry, kind: Kind) {
  return String(
    (kind === "progress"
      ? row.payload.progress_date
      : kind === "meters"
        ? row.payload.reading_at
        : kind === "reminders" || kind === "documents"
          ? row.payload.due_at
          : row.payload.event_at) ?? row.created_at,
  );
}
export function recordDate(
  row: RecordEntry,
  kind: Kind,
  timezone = "Asia/Kolkata",
) {
  return readableDateTime(recordTimestamp(row, kind), timezone);
}
export function RecordBadge({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: IconTone;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: c.background,
      }}
    >
      <Text
        style={{
          color: tone === "coral" ? c.danger : c.primary,
          fontSize: 11,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export function RecordCard({
  row,
  kind,
  timezone,
  onPress,
}: {
  row: RecordEntry;
  kind: Kind;
  timezone?: string;
  onPress?: () => void;
}) {
  const c = useTheme();
  const visual = recordVisuals[kind];
  const status = r(row.status as keyof typeof recordCopy) ?? row.status;
  const content = (
    <Card style={{ padding: 14, gap: 10, borderRadius: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <ColorIcon name={visual.icon} tone={visual.tone} size={20} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ color: c.ink, fontWeight: "700", fontSize: 15 }}>
            {String(row.payload.title || row.payload.progress_date || r(kind))}
          </Text>
          <Timestamp value={recordTimestamp(row, kind)} timezone={timezone} />
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        )}
      </View>
      {row.payload.amount_paise !== undefined && (
        <Text style={{ color: c.ink, fontWeight: "800", fontSize: 23 }}>
          {money(Number(row.payload.amount_paise))}
        </Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <RecordBadge label={status} tone={visual.tone} />
        {kind === "fuel" && (
          <>
            <RecordBadge
              label={
                r(String(row.payload.energy_type) as keyof typeof recordCopy) ??
                String(row.payload.energy_type)
              }
            />
            <RecordBadge
              label={`${row.payload.quantity ?? "—"} ${row.payload.unit ?? ""}`}
            />
            <RecordBadge
              label={r(row.payload.is_full_tank ? "full" : "partial")}
            />
            {!row.payload.reading_at && (
              <RecordBadge label={r("pendingReading")} tone="coral" />
            )}
          </>
        )}
        {kind === "expenses" && row.payload.category !== undefined && (
          <RecordBadge
            label={
              r(String(row.payload.category) as keyof typeof recordCopy) ??
              String(row.payload.category)
            }
          />
        )}
        {kind === "meters" && (
          <>
            {row.payload.km !== null && row.payload.km !== undefined && (
              <RecordBadge label={`${row.payload.km} KM`} />
            )}{" "}
            {row.payload.hours !== null && row.payload.hours !== undefined && (
              <RecordBadge label={`${row.payload.hours} HOURS`} />
            )}
          </>
        )}
        {(kind === "documents" || kind === "reminders") &&
          row.payload.category !== undefined && (
            <RecordBadge
              label={
                r(String(row.payload.category) as keyof typeof recordCopy) ??
                String(row.payload.category)
              }
            />
          )}
      </View>
    </Card>
  );
  return onPress ? (
    <MotionPress
      label={`${r("detail")}: ${String(row.payload.title || r(kind))}`}
      onPress={onPress}
    >
      {content}
    </MotionPress>
  ) : (
    content
  );
}
export function RecordSummary({
  kind,
  value,
  subtitle,
}: {
  kind: Kind;
  value: string;
  subtitle: string;
}) {
  const visual = recordVisuals[kind];
  return (
    <GradientSurface
      colors={visual.colors}
      style={{ padding: 18, gap: 10, borderRadius: 24 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name={visual.icon} color="#FFF" size={22} />
        <Text style={{ color: "#F0F4FF", fontSize: 14, fontWeight: "600" }}>
          {r(kind)}
        </Text>
      </View>
      <Text style={{ color: "#FFF", fontSize: 28, fontWeight: "800" }}>
        {value}
      </Text>
      <Text style={{ color: "#F0F4FF", fontSize: 12 }}>{subtitle}</Text>
    </GradientSurface>
  );
}
