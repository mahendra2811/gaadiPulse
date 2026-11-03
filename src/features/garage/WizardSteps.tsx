import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { type IconName } from "@/src/components/ui/premium";
const icons: IconName[] = [
  "car-sport",
  "grid",
  "pricetag",
  "document-text",
  "speedometer",
  "checkmark-circle",
];
export function WizardSteps({
  step,
  titles,
  onStep,
  disabled,
}: {
  step: number;
  titles: string[];
  onStep: (step: number) => void;
  disabled: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: c.primary, fontSize: 13, fontWeight: "700" }}
        >
          {t("uiStep")} {step + 1} {t("uiOf")} {titles.length}
        </Text>
        <Text style={{ fontSize: 12, color: c.muted }}>
          {t("uiVehicleSetup")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {titles.map((title, index) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={`${t("uiStep")} ${index + 1}: ${title}`}
            accessibilityState={{
              selected: step === index,
              disabled: disabled || index > step,
            }}
            disabled={disabled || index > step}
            onPress={() => onStep(index)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <View
              style={{
                height: 4,
                alignSelf: "stretch",
                borderRadius: 4,
                backgroundColor: index <= step ? c.primary : c.line,
              }}
            />
            <Ionicons
              name={index < step ? "checkmark" : icons[index]}
              size={18}
              color={index <= step ? c.primary : c.muted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
