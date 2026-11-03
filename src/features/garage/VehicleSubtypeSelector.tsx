import { SearchField } from "@/src/components/ui/SearchField";
import { useState } from "react";
import { Image, Pressable, View, Text } from "react-native";
import { AppText, AppButton, InputField } from "@/src/components/ui";
import { getVehicleSubtypeImage } from "@/assets/vehicle-subtypes";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { subtypeOptions, subtypeLabel } from "./subtypes";

export function VehicleSubtypeSelector({
  category,
  value,
  onChange,
  disabled = false,
}: {
  category: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const options = subtypeOptions(category);
  const manual =
    value === "other" ||
    (!!value && !options.some((item) => item.id === value));
  const term = search.trim().toLowerCase();
  const visible = options.filter((item) =>
    term
      ? `${subtypeLabel(item.id)} ${item.id}`.toLowerCase().includes(term)
      : showAll || item.recommended || item.id === value,
  );
  return (
    <View style={{ gap: 10 }}>
      <SearchField
        label={t("subtypeSearch")}
        value={search}
        onChange={setSearch}
      />
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
      >
        {visible.map((item) => {
          const selected = item.id === value || (item.id === "other" && manual);
          return (
            <Pressable
              key={item.id}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityLabel={subtypeLabel(item.id)}
              accessibilityState={{ checked: selected, disabled }}
              onPress={() => onChange(item.id)}
              style={({ pressed }) => ({
                width: "47%",
                flexGrow: 1,
                maxWidth: "49%",
                padding: 8,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: selected ? colors.accent : colors.line,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.75 : 1,
                gap: 6,
              })}
            >
              <Image
                source={getVehicleSubtypeImage(item.id)}
                style={{ width: "100%", aspectRatio: 1 }}
                resizeMode="contain"
                accessible={false}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.ink,
                  textAlign: "center",
                  paddingBottom: 4,
                }}
              >
                {selected ? "✓ " : ""}
                {subtypeLabel(item.id)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!visible.length && <AppText>{t("subtypeNoMatch")}</AppText>}
      {!term && (
        <AppButton
          secondary
          label={t(showAll ? "subtypeCommon" : "subtypeSeeAll")}
          onPress={() => setShowAll((current) => !current)}
        />
      )}
      {manual && (
        <InputField
          label={t("subtypeManual")}
          value={value === "other" ? "" : value}
          onChangeText={(text) => onChange(text || "other")}
          editable={!disabled}
          maxLength={80}
        />
      )}
      <AppText muted>{t("subtypeIllustration")}</AppText>
    </View>
  );
}
