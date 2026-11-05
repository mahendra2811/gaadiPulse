import {
  VEHICLE_SUBTYPE_IMAGES,
  type VehicleSubtypeId,
} from "@/assets/vehicle-subtypes";
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
  logo: require("../../assets/media/logo/new/02-square-dark.png"),
  logoLight: require("../../assets/media/logo/new/03-square-light.png"),
  logoCircle: require("../../assets/media/logo/new/05-circle-light.png"),
  wordmarkLight: require("../../assets/media/logo/new/07-header-transparent.png"),
  wordmarkDark: require("../../assets/media/logo/new/08-header-dark.png"),
};
export { VEHICLE_SUBTYPE_IMAGES as subtypeArtwork } from "@/assets/vehicle-subtypes";
export function vehicleArt(_category: string, subtype: string) {
  return Object.prototype.hasOwnProperty.call(VEHICLE_SUBTYPE_IMAGES, subtype)
    ? VEHICLE_SUBTYPE_IMAGES[subtype as VehicleSubtypeId]
    : VEHICLE_SUBTYPE_IMAGES.other;
}
