import { useState } from "react";
import { Image, View, Text } from "react-native";
import { vehicleArt } from "@/src/lib/assets";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { AppText, Card, Sheet } from "@/src/components/ui";
import {
  GradientSurface,
  TextAction,
  MenuRow,
} from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
export function VehicleHeader({
  vehicleId,
  onSelect,
  disabled = false,
  allowSwitch = true,
  hero = false,
}: {
  vehicleId?: string;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  allowSwitch?: boolean;
  hero?: boolean;
} = {}) {
  const { vehicle: activeVehicle, data, select } = useActiveVehicle();
  const vehicle = vehicleId
    ? data?.find((v) => v.id === vehicleId)
    : activeVehicle;
  const [open, setOpen] = useState(false);
  const colors = useTheme();
  const vehicles = data?.filter((v) => !v.archived_at) ?? [];
  if (!vehicle) return null;
  const title =
    vehicle.nickname || vehicle.registration_number || vehicle.model;
  const content = (
    <>
      {hero && (
        <Text
          style={{
            color: "#D0F0E8",
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {t("uiActiveVehicle")}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {hero ? (
            <Text style={{ fontSize: 25, fontWeight: "800", color: "#FFFFFF" }}>
              {title}
            </Text>
          ) : (
            <AppText large>{title}</AppText>
          )}
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: 10,
              backgroundColor: hero ? "#FFFFFF20" : "transparent",
              paddingHorizontal: hero ? 8 : 0,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                color: hero ? "#E5FFF7" : colors.primary,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {t(vehicle.role === "OWNER" ? "owner" : "pilot")} ·{" "}
              {t(vehicle.meter_mode)}
            </Text>
          </View>
          {allowSwitch && vehicles.length > 1 && !disabled && (
            <TextAction
              label={t("switch")}
              icon="swap-horizontal"
              light={hero}
              onPress={() => setOpen(true)}
            />
          )}
        </View>
        <View
          style={{
            width: hero ? 112 : 84,
            aspectRatio: 1,
            borderRadius: 22,
            backgroundColor: "#F1F9F6",
            overflow: "hidden",
          }}
        >
          <Image
            source={vehicleArt(vehicle.category, vehicle.subtype)}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
            accessible={false}
          />
        </View>
      </View>
    </>
  );
  return (
    <>
      {hero ? (
        <GradientSurface style={{ padding: 20, gap: 14 }}>
          {content}
        </GradientSurface>
      ) : (
        <Card style={{ padding: 16 }}>{content}</Card>
      )}
      <Sheet visible={open} onClose={() => setOpen(false)}>
        {vehicles.map((v) => (
          <View
            key={v.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Image
              source={vehicleArt(v.category, v.subtype)}
              style={{ width: 56, height: 56, borderRadius: 14 }}
              resizeMode="contain"
              accessible={false}
            />
            <View style={{ flex: 1 }}>
              <MenuRow
                label={`${v.id === vehicle.id ? "✓ " : ""}${v.nickname || v.registration_number || v.model}`}
                subtitle={t(v.role === "OWNER" ? "owner" : "pilot")}
                icon="swap-horizontal"
                tone="mint"
                onPress={() => {
                  if (disabled) return;
                  if (onSelect) onSelect(v.id);
                  else select(v.id);
                  setOpen(false);
                }}
              />
            </View>
          </View>
        ))}
      </Sheet>
    </>
  );
}
