/** Vehicle powertrain configuration is separate from the fuel actually purchased. */
export const vehicleEnergyTypes = [
  "DIESEL",
  "PETROL",
  "PETROL_CNG",
  "PETROL_LPG",
  "ELECTRIC",
  "HYBRID",
  "PLUGIN_HYBRID",
  "DIESEL_HYBRID",
  "CNG",
  "LPG",
  "HYDROGEN",
  "OTHER",
] as const;
export const fuelTypes = [
  "DIESEL",
  "PETROL",
  "CNG",
  "LPG",
  "ELECTRIC",
  "HYDROGEN",
  "OTHER",
  "HYBRID",
] as const;
export type FuelType = (typeof fuelTypes)[number];
const allowed: Record<string, readonly FuelType[]> = {
  DIESEL: ["DIESEL"],
  PETROL: ["PETROL"],
  PETROL_CNG: ["PETROL", "CNG"],
  PETROL_LPG: ["PETROL", "LPG"],
  ELECTRIC: ["ELECTRIC"],
  HYBRID: ["PETROL"],
  PLUGIN_HYBRID: ["PETROL", "ELECTRIC"],
  DIESEL_HYBRID: ["DIESEL"],
  CNG: ["CNG"],
  LPG: ["LPG"],
  HYDROGEN: ["HYDROGEN"],
  OTHER: ["OTHER"],
};
export function allowedFuelTypes(profile: string): readonly FuelType[] {
  return allowed[profile] ?? [];
}
export function fuelUnit(type: string): "L" | "KG" | "KWH" {
  return type === "ELECTRIC"
    ? "KWH"
    : type === "CNG" || type === "HYDROGEN"
      ? "KG"
      : "L";
}
export function defaultFuel(profile: string) {
  const energy_type = allowedFuelTypes(profile)[0] ?? "OTHER";
  return { energy_type, unit: fuelUnit(energy_type) };
}
export function permittedFuel(
  profile: string,
  type: string,
  original?: { energy_type?: unknown; unit?: unknown },
) {
  return (
    allowedFuelTypes(profile).some((fuel) => fuel === type) ||
    (original?.energy_type === type && original.unit === fuelUnit(type))
  );
}
