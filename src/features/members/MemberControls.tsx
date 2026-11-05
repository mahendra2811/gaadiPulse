import { Pressable, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppText } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import {
  effectivePilotPermission,
  pilotPermissionGroups,
  resetPilotOverrides,
} from "./permissions";
export function RolePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: "OWNER" | "PILOT";
  onChange: (role: "OWNER" | "PILOT") => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      {(
        [
          [
            "OWNER",
            "Owner",
            "Manage this vehicle, its records and member access.",
          ],
          ["PILOT", "Pilot", "Use permitted fuel, expense and meter actions."],
        ] as const
      ).map(([role, title, description]) => (
        <Pressable
          key={role}
          accessibilityRole="radio"
          accessibilityLabel={`${title}. ${description}`}
          accessibilityState={{ checked: value === role, disabled }}
          disabled={disabled}
          onPress={() => onChange(role)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: value === role ? c.primary : c.line,
            borderRadius: 14,
            padding: 12,
            minHeight: 62,
            opacity: disabled ? 0.65 : 1,
          }}
        >
          <Ionicons
            name={value === role ? "radio-button-on" : "radio-button-off"}
            size={22}
            color={value === role ? c.primary : c.muted}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: c.ink, fontWeight: "700" }}>{title}</Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>{description}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
export function PermissionEditor({
  value,
  defaults = {},
  onChange,
  inherited = false,
  disabled = false,
}: {
  value: Record<string, boolean>;
  defaults?: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
  inherited?: boolean;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <AppText muted>
        Viewing and adding are separate. Pilots can view only today and
        yesterday in this vehicle’s time zone, and cannot edit or delete
        records.
      </AppText>
      {pilotPermissionGroups.map((group) => (
        <View
          key={group.title}
          style={{
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 14,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: c.ink, fontWeight: "700", paddingTop: 12 }}>
            {group.title}
          </Text>
          {(
            [
              [group.read, "View records"],
              [group.create, "Add records"],
            ] as const
          ).map(([key, label]) => (
            <View
              key={key}
              style={{
                minHeight: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink }}>{label}</Text>
                {inherited && (
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    {key in value
                      ? "Custom for this person"
                      : "Uses vehicle default"}
                  </Text>
                )}
              </View>
              <Switch
                accessibilityLabel={`${group.title}: ${label}`}
                disabled={disabled}
                value={effectivePilotPermission(key, value, defaults)}
                onValueChange={(enabled) =>
                  onChange({ ...value, [key]: enabled })
                }
              />
            </View>
          ))}
        </View>
      ))}
      {inherited && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onChange(resetPilotOverrides(value))}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: c.primary, fontWeight: "700" }}>
            Use vehicle defaults for these permissions
          </Text>
        </Pressable>
      )}
    </View>
  );
}
