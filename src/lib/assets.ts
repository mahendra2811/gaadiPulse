export const artwork = {
  two_wheeler: require("../../assets/vehicle-two-wheeler.png"),
  four_wheeler: require("../../assets/vehicle-four-wheeler.png"),
  commercial: require("../../assets/vehicle-commercial.png"),
  agricultural: require("../../assets/vehicle-agricultural.png"),
  heavy_machinery: require("../../assets/vehicle-heavy-machinery.png"),
  garage: require("../../assets/empty-garage.png"),
  fuel: require("../../assets/empty-fuel.png"),
  expenses: require("../../assets/empty-expenses.png"),
  progress: require("../../assets/empty-progress.png"),
  offline: require("../../assets/empty-offline.png"),
  error: require("../../assets/empty-error.png"),
  onboarding: [
    require("../../assets/onboarding-1.png"),
    require("../../assets/onboarding-2.png"),
    require("../../assets/onboarding-3.png"),
  ],
  logo: require("../../assets/app-icon.png"),
};
export const subtypeArtwork = {
  motorcycle: require("../../assets/vehicle-subtypes/motorcycle.png"),
  scooter: require("../../assets/vehicle-subtypes/scooter.png"),
  hatchback: require("../../assets/vehicle-subtypes/hatchback.png"),
  sedan: require("../../assets/vehicle-subtypes/sedan.png"),
  suv: require("../../assets/vehicle-subtypes/suv.png"),
  pickup: require("../../assets/vehicle-subtypes/pickup.png"),
  tipper: require("../../assets/vehicle-subtypes/tipper.png"),
  bus: require("../../assets/vehicle-subtypes/bus.png"),
  tractor: require("../../assets/vehicle-subtypes/tractor.png"),
  excavator: require("../../assets/vehicle-subtypes/excavator.png"),
  loader: require("../../assets/vehicle-subtypes/loader.png"),
  other: require("../../assets/vehicle-subtypes/other.png"),
};
export function vehicleArt(
  category: keyof Pick<
    typeof artwork,
    | "two_wheeler"
    | "four_wheeler"
    | "commercial"
    | "agricultural"
    | "heavy_machinery"
  >,
  subtype: string,
) {
  return subtype in subtypeArtwork
    ? subtypeArtwork[subtype as keyof typeof subtypeArtwork]
    : artwork[category];
}
