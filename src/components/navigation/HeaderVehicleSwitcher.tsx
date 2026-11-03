import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { subtypeLabel } from "@/src/features/garage/subtypes";
import { AppButton } from "@/src/components/ui";
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
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#0008",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={() => setOpen(false)}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "80%",
              flexShrink: 1,
              backgroundColor: c.surface,
              borderRadius: 22,
              padding: 16,
              gap: 14,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ color: c.ink, fontSize: 18, fontWeight: "700" }}
            >
              {t("switch")}
            </Text>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: 6 }}
              keyboardShouldPersistTaps="handled"
            >
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
                      <Text style={{ color: c.ink, fontWeight: "600" }}>
                        {label}
                      </Text>
                      <Text style={{ color: c.muted, fontSize: 12 }}>
                        {t(item.role === "OWNER" ? "owner" : "pilot")}
                        {item.nickname && item.registration_number
                          ? ` · ${item.registration_number}`
                          : ""}
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={c.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <AppButton
              secondary
              label={t("cancel")}
              onPress={() => setOpen(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
