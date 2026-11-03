import { useState } from "react";
import { Text, View } from "react-native";
import { Card } from "@/src/components/ui";
import { ColorIcon, Expandable, TextAction } from "@/src/components/ui/premium";
import { Timestamp } from "@/src/components/ui/Timestamp";
import { RecordBadge } from "@/src/features/records/RecordCard";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { r } from "@/src/features/records/copy";
export type HistoryReading = {
  id: string;
  reading_type: "KM" | "HOURS";
  value: number;
  observed_at: string;
  entered_at?: string;
  source?: string;
  status?: string;
  is_reset?: boolean;
};
export function ReadingCard({
  reading,
  timezone,
  onCorrect,
}: {
  reading: HistoryReading;
  timezone?: string;
  onCorrect?: () => void;
}) {
  const c = useTheme();
  const [expanded, setExpanded] = useState(false);
  const sources: Record<string, string> = {
    MANUAL: t("meterManual"),
    FUEL: r("fuel"),
    EXPENSE: r("expenses"),
    PROGRESS: r("progress"),
    BASELINE: t("meterBaseline"),
  };
  const source = reading.source
    ? (sources[reading.source] ?? reading.source)
    : r("development");
  return (
    <Card style={{ padding: 14, gap: 11, borderRadius: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <ColorIcon
          name={reading.reading_type === "KM" ? "speedometer" : "time"}
          tone={reading.reading_type === "KM" ? "cyan" : "violet"}
          size={20}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: c.ink }}>
            {reading.value.toLocaleString("en-IN", {
              maximumFractionDigits: 3,
            })}
            <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted }}>
              {" "}
              {reading.reading_type}
            </Text>
          </Text>
          <Text style={{ fontSize: 11, color: c.muted }}>{source}</Text>
        </View>
        {reading.status === "CORRECTED" && (
          <RecordBadge label={t("meterCorrected")} tone="coral" />
        )}
      </View>
      <Timestamp
        value={reading.observed_at}
        timezone={timezone}
        label={r("observed")}
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {reading.is_reset ? (
          <RecordBadge label={r("reset")} tone="coral" />
        ) : (
          <RecordBadge
            label={
              reading.status === "CORRECTED"
                ? t("meterHistorical")
                : t("meterActual")
            }
          />
        )}
        <TextAction
          label={r("detail")}
          icon={expanded ? "chevron-up" : "chevron-down"}
          onPress={() => setExpanded((value) => !value)}
        />
      </View>
      <Expandable expanded={expanded}>
        <View style={{ gap: 8 }}>
          {reading.entered_at && (
            <Timestamp
              value={reading.entered_at}
              timezone={timezone}
              label={t("meterRecorded")}
            />
          )}
          {onCorrect && (
            <TextAction
              label={r("correction")}
              icon="create-outline"
              onPress={onCorrect}
            />
          )}
        </View>
      </Expandable>
    </Card>
  );
}
