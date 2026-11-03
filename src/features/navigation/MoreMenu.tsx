import { View, Text } from "react-native";
import type { Href } from "expo-router";
import { useActiveVehicle } from "@/src/features/garage/hooks";
import { usePermissions } from "@/src/features/records/hooks";
import { useProfile } from "@/src/features/auth/profile";
import { SignOutButton } from "@/src/features/auth/SignOutButton";
import { ErrorState, AppText } from "@/src/components/ui";
import {
  MenuRow,
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
        {
          label: r("progress"),
          icon: "checkbox",
          tone: "violet",
          href: record("progress", "add"),
          show: !!access.data?.["progress.submit"],
        },
        {
          label: r("documents"),
          icon: "document-text",
          tone: "amber",
          href: record("documents", "add"),
          show: !!access.data?.owner,
        },
        {
          label: r("addMaintenance"),
          icon: "build",
          tone: "coral",
          href: record("expenses", "add", { category: "SERVICE" }),
          show: !!access.data?.["expenses.create"],
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
          label: r("progress"),
          icon: "calendar",
          tone: "violet",
          href: record("progress"),
          show: !!access.data?.["progress.view"],
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
          label: r("maintenance"),
          icon: "construct",
          tone: "cyan",
          href: "/maintenance",
          show: !!access.data?.["expenses.read"],
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
          label: r("approvals"),
          icon: "checkmark-done-circle",
          tone: "mint",
          href: "/progress/approvals",
          show: !!access.data?.owner,
        },
        {
          label: r("members"),
          icon: "people",
          tone: "violet",
          href: "/owner/members",
          show: !!access.data?.owner,
        },
        {
          label: r("builder"),
          icon: "options",
          tone: "blue",
          href: "/owner/form-builder",
          show: !!access.data?.owner,
        },
      ],
    },
    {
      title: t("uiAccount"),
      items: [
        {
          label: t("profile"),
          icon: "person-circle",
          tone: "violet",
          href: "/settings/profile",
        },
        {
          label: t("settings"),
          icon: "settings",
          tone: "blue",
          href: "/settings",
        },
        {
          label: t("sync"),
          icon: "cloud-upload",
          tone: "cyan",
          href: "/settings/sync",
        },
        {
          label: r("security"),
          icon: "shield-checkmark",
          tone: "mint",
          href: "/settings/security",
        },
        {
          label: r("help"),
          icon: "help-buoy",
          tone: "amber",
          href: "/settings/help",
        },
        {
          label: t("about"),
          icon: "information-circle",
          tone: "blue",
          href: "/settings/about",
        },
      ],
    },
  ];
  return (
    <View style={{ gap: 22 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingBottom: 4,
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
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#3157BF" }}>
            {profile.data?.display_name?.slice(0, 1).toUpperCase() || "G"}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText large>{profile.data?.display_name || t("app")}</AppText>
          <AppText muted>
            {active.vehicle?.nickname || active.vehicle?.model || t("tagline")}
          </AppText>
        </View>
      </View>
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
        const items = group.items.filter((item) => item.show !== false);
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
      <View style={{ paddingTop: 8, borderTopWidth: 1, borderColor: c.line }}>
        <SignOutButton />
      </View>
    </View>
  );
}
