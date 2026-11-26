import {
  VEHICLE_SUBTYPE_IMAGES,
  type VehicleSubtypeId,
} from "@/assets/vehicle-subtypes";
export const artwork = {
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
