import { deferredPath, releaseFeatures } from "@/src/features/release/scope";
import { View, Text } from "react-native";
import type { Href } from "expo-router";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { usePermissions } from "@/src/features/records/hooks";
import { useProfile } from "@/src/features/auth/profile";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ErrorState, AppText } from "@/src/components/ui";
import {
  MenuRow,
  MotionPress,
  type IconName,
  type IconTone,
} from "@/src/components/ui/premium";
import { useTheme } from "@/src/lib/theme";
import { t } from "@/src/lib/i18n";
import { r } from "@/src/features/records/copy";
export function MoreMenu({ navigate }: { navigate: (href: Href) => void }) {
  const active = useActiveVehicle();
  const access = usePermissions(active.vehicle?.id);
  const profile = useProfile();
  const c = useTheme();
  const record = (
    kind: string,
    action?: string,
    extra: Record<string, string> = {},
  ): Href =>
    action
      ? {
          pathname: "/records/[kind]/[action]",
          params: { kind, action, ...extra, vehicle: active.vehicle?.id },
        }
      : { pathname: "/records/[kind]", params: { kind } };
  type Item = {
    label: string;
    icon: IconName;
    tone: IconTone;
    href: Href;
    show?: boolean;
  };
  const groups: { title: string; items: Item[] }[] = [
    {
      title: t("uiQuickAdd"),
      items: [
        {
          label: t("add"),
          icon: "car-sport",
          tone: "mint",
          href: "/garage/add",
        },
        {
          label: r("addMeter"),
          icon: "speedometer",
          tone: "blue",
          href: record("meters", "add"),
          show: !!access.data?.["meters.create"],
        },
      ],
    },
    {
      title: t("uiVehicleTools"),
      items: [
        {
          label: t("garage"),
          icon: "car-sport",
          tone: "mint",
          href: "/garage",
        },
        {
          label: r("meters"),
          icon: "speedometer",
          tone: "blue",
          href: "/meters/history",
          show: !!access.data?.["meters.read"],
        },
        {
          label: r("documents"),
          icon: "documents",
          tone: "amber",
          href: record("documents"),
          show: !!access.data?.["documents.read"],
        },
        {
          label: r("reminders"),
          icon: "notifications",
          tone: "coral",
          href: record("reminders"),
          show: !!access.data?.["reminders.read"],
        },
        {
          label: "Insights",
          icon: "analytics",
          tone: "violet",
          href: "/insights",
          show: !!access.data?.["reports.read"],
        },
        {
          label: r("reports"),
          icon: "stats-chart",
          tone: "blue",
          href: "/reports",
          show: !!access.data?.["reports.read"],
        },
      ],
    },
    {
      title: t("uiOwnerTools"),
      items: [
        {
          label: r("members"),
          icon: "people",
          tone: "violet",
          href: "/owner/members",
          show: !!access.data?.owner,
        },
      ],
    },
    {
      title: t("uiAccount"),
      items: [
        {
          label: t("settings"),
          icon: "settings",
          tone: "blue",
          href: "/settings",
        },
      ],
    },
  ];
  return (
    <View style={{ gap: 22 }}>
      <MotionPress
        label={`${t("profile")}: ${profile.data?.display_name || t("app")}`}
        onPress={() => navigate("/settings/profile")}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingBottom: 4,
            minHeight: 48,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 18,
              backgroundColor: "#E5ECFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={profile.data?.avatar_icon ?? "person-circle"}
              size={28}
              color="#3157BF"
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText large>{profile.data?.display_name || t("app")}</AppText>
            <AppText muted>
              {active.vehicle?.nickname ||
                active.vehicle?.model ||
                t("tagline")}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.muted} />
        </View>
      </MotionPress>
      {active.error && (
        <ErrorState
          message={active.error.message}
          retry={() => void active.refetch()}
        />
      )}
      {access.error && (
        <ErrorState
          message={access.error.message}
          retry={() => void access.refetch()}
        />
      )}
      {groups.map((group) => {
        const items = group.items.filter((item) => {
          if (item.show === false) return false;
          if (releaseFeatures.advancedTools) return true;
          const path =
            typeof item.href === "string" ? item.href : item.href.pathname;
          if (deferredPath(path)) return false;
          if (typeof item.href === "object" && "params" in item.href) {
            const params = item.href.params as
              Record<string, unknown> | undefined;
            if (
              params?.kind &&
              !["fuel", "expenses", "meters"].includes(String(params.kind))
            )
              return false;
            if (params?.category === "SERVICE") return false;
          }
          return true;
        });
        return items.length ? (
          <View key={group.title} style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1,
                color: c.muted,
                textTransform: "uppercase",
              }}
            >
              {group.title}
            </Text>
            <View>
              {items.map((item, index) => (
                <View
                  key={item.href.toString() + item.label}
                  style={{
                    borderBottomWidth: index === items.length - 1 ? 0 : 1,
                    borderBottomColor: c.line,
                  }}
                >
                  <MenuRow
                    label={item.label}
                    icon={item.icon}
                    tone={item.tone}
                    onPress={() => navigate(item.href)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null;
      })}
    </View>
  );
}
