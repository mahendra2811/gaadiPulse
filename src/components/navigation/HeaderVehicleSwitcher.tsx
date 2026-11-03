import { Popup } from "@/src/components/ui/Popup";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { subtypeLabel } from "@/src/features/garage/subtypes";
import { useTheme } from "@/src/lib/theme";
import { vehicleArt } from "@/src/lib/assets";
import { t } from "@/src/lib/i18n";

export function HeaderVehicleSwitcher() {
  const { vehicle, data, select } = useActiveVehicle();
  const [open, setOpen] = useState(false);
  const c = useTheme();
  const vehicles = data?.filter((item) => !item.archived_at) ?? [];
  if (!vehicle) return null;
  const title =
    vehicle.nickname?.trim() ||
    vehicle.registration_number?.trim() ||
    vehicle.model ||
    subtypeLabel(vehicle.subtype);
  const canSwitch = vehicles.length > 1;
  return (
    <>
      <Pressable
        accessibilityRole={canSwitch ? "button" : undefined}
        accessibilityLabel={canSwitch ? `${t("switch")}: ${title}` : title}
        accessibilityState={{ expanded: canSwitch ? open : undefined }}
        disabled={!canSwitch}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          maxWidth: "43%",
          minWidth: 0,
          minHeight: 44,
          paddingHorizontal: 8,
          borderRadius: 12,
          backgroundColor: c.background,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Ionicons name="car-outline" size={18} color={c.primary} />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            flexShrink: 1,
            minWidth: 0,
            color: c.ink,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
        {canSwitch && (
          <Ionicons name="swap-horizontal" size={18} color={c.primary} />
        )}
      </Pressable>
      <Popup visible={open} onClose={() => setOpen(false)} title={t("switch")}>
        {vehicles.map((item) => {
          const label =
            item.nickname?.trim() ||
            item.registration_number?.trim() ||
            item.model ||
            subtypeLabel(item.subtype);
          const selected = item.id === vehicle.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: selected }}
              onPress={() => {
                select(item.id);
                setOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 10,
                minHeight: 64,
                borderRadius: 12,
                backgroundColor: selected ? c.background : c.surface,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Image
                source={vehicleArt(item.category, item.subtype)}
                resizeMode="contain"
                accessible={false}
                style={{ width: 48, height: 48 }}
              />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={{ color: c.ink, fontWeight: "600" }}>{label}</Text>
                <Text style={{ color: c.muted, fontSize: 12 }}>
                  {t(item.role === "OWNER" ? "owner" : "pilot")}
                  {item.nickname && item.registration_number
                    ? ` · ${item.registration_number}`
                    : ""}
                </Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={22} color={c.primary} />
              )}
            </Pressable>
          );
        })}
      </Popup>
    </>
  );
}
