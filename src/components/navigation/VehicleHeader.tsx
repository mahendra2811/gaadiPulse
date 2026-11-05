import { View, Text } from "react-native";
import { SquareArtwork } from "@/src/components/ui/SquareArtwork";
import { subtypeLabel } from "@/src/features/garage/subtypes";
import { vehicleArt } from "@/src/lib/assets";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { Card } from "@/src/components/ui";
import { GradientSurface } from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { r, recordCopy } from "@/src/features/records/copy";

export function VehicleHeader({
  vehicleId,
  hero = false,
}: {
  vehicleId?: string;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  allowSwitch?: boolean;
  hero?: boolean;
} = {}) {
  const { vehicle: activeVehicle, data } = useActiveVehicle();
  const vehicle = vehicleId
    ? data?.find((v) => v.id === vehicleId)
    : activeVehicle;
  const colors = useTheme();
  if (!vehicle) return null;
  const title =
    vehicle.nickname ||
    vehicle.registration_number ||
    vehicle.brand ||
    subtypeLabel(vehicle.subtype);
  const ink = hero ? "#FFFFFF" : colors.ink;
  const muted = hero ? "#D0F0E8" : colors.muted;
  const brand = vehicle.brand.trim();
  const energy =
    r(vehicle.energy_type as keyof typeof recordCopy) ??
    vehicle.energy_type.replaceAll("_", " + ");
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: "25%", flexShrink: 0 }}>
        <SquareArtwork source={vehicleArt(vehicle.category, vehicle.subtype)} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text style={{ color: ink, fontSize: 18, fontWeight: "800" }}>
          {title}
        </Text>
        {!!vehicle.registration_number &&
          vehicle.registration_number !== title && (
            <Text style={{ color: muted, fontSize: 14, fontWeight: "400" }}>
              {vehicle.registration_number}
            </Text>
          )}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        {!!brand && brand.toLowerCase() !== title.toLowerCase() && (
          <Text style={{ color: ink, fontSize: 14, fontWeight: "600" }}>
            {brand}
          </Text>
        )}
        <Text style={{ color: muted, fontSize: 14 }}>{energy}</Text>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: hero ? "#FFFFFF24" : colors.background,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: hero ? "#FFFFFF" : colors.primary,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {t(vehicle.role === "OWNER" ? "owner" : "pilot")}
          </Text>
        </View>
      </View>
    </View>
  );
  return hero ? (
    <GradientSurface style={{ padding: 12 }}>{content}</GradientSurface>
  ) : (
    <Card style={{ padding: 12 }}>{content}</Card>
  );
}
