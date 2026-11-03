import catalog from "@/assets/vehicle-subtypes/vehicle-catalog.v2.json";
import { t } from "@/src/lib/i18n";

export type VehicleSubtypeOption = {
  id: string;
  label: string;
  recommended: boolean;
  defaultMeterMode: string;
};
const agriculturalIds = new Set(["tractor", "harvester"]);
export function subtypeOptions(category: string): VehicleSubtypeOption[] {
  const group =
    category === "agricultural" || category === "heavy_machinery"
      ? "agriculture_heavy"
      : category;
  const items =
    catalog.categories.find((item) => item.id === group)?.subtypes ?? [];
  const filtered =
    category === "agricultural"
      ? items.filter((item) => agriculturalIds.has(item.id))
      : category === "heavy_machinery"
        ? items.filter((item) => !agriculturalIds.has(item.id))
        : items;
  return [
    ...filtered.filter((item) => item.id !== "other"),
    {
      id: "other",
      label: "Other Vehicle / Machine",
      recommended: true,
      defaultMeterMode: category === "heavy_machinery" ? "HOURS" : "KM",
    },
  ];
}
export function subtypeLabel(id: string) {
  const item = catalog.categories
    .flatMap((category) => category.subtypes)
    .find((item) => item.id === id);
  return item ? t(`subtype_${item.id}` as Parameters<typeof t>[0]) : id;
}
export function suggestedSubtypeMeter(id: string) {
  const mode = catalog.categories
    .flatMap((category) => category.subtypes)
    .find((item) => item.id === id)?.defaultMeterMode;
  return mode === "KM" || mode === "HOURS" || mode === "BOTH" ? mode : null;
}
