import { SearchField } from "@/src/components/ui/SearchField";
import { useState } from "react";
import { View } from "react-native";
import { AppText, AppButton, InputField } from "@/src/components/ui";
import { getVehicleSubtypeImage } from "@/assets/vehicle-subtypes";
import { VehicleChoiceGrid } from "./VehicleChoiceGrid";
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
      <VehicleChoiceGrid
        options={visible.map((item) => ({
          id: item.id,
          label: subtypeLabel(item.id),
          image: getVehicleSubtypeImage(item.id),
        }))}
        value={manual ? "other" : value}
        disabled={disabled}
        onChange={onChange}
      />
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
