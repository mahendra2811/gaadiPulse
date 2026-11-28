import { useEffect, useMemo, useState } from "react";
import { AppState, Linking, Platform, Switch, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import {
  AppButton,
  AppText,
  Card,
  ErrorState,
  InputField,
  Screen,
  useToast,
} from "@/src/components/ui";
import { PageSkeleton } from "@/src/components/ui/PageSkeleton";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { t } from "@/src/lib/i18n";
import { errorMessage } from "@/src/lib/errors";
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "./api";
import type { NotificationPreferences } from "./schema";
import { enablePushNotifications } from "@/src/features/reminders/notifications";

function timeInput(value: string) {
  return value.slice(0, 5);
}

function toDatabaseTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error(t("notifications.timeFormat"));
  return `${value}:00`;
}

export function NotificationSettings() {
  const user = useAccountId();
  const { development } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const preferences = useQuery({
    queryKey: [user, "notification-preferences"],
    enabled: !!user && !development,
    queryFn: loadNotificationPreferences,
    staleTime: 60_000,
  });
  const current = useMemo(
    () => draft ?? preferences.data ?? null,
    [draft, preferences.data],
  );
  useEffect(() => {
    if (Platform.OS === "web") return;
    let alive = true;
    const read = () =>
      void Notifications.getPermissionsAsync().then((value) => {
        if (alive) setPermission(value.granted);
      });
    read();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => {
      alive = false;
      listener.remove();
    };
  }, []);
  const save = useMutation({
    mutationFn: saveNotificationPreferences,
    onSuccess: async (value) => {
      setDraft(value);
      await queryClient.invalidateQueries({
        queryKey: [user, "notification-preferences"],
      });
      toast(t("notifications.notificationSaved"), "success");
    },
  });
  const update = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    if (current) setDraft({ ...current, [key]: value });
  };
  const enable = async () => {
    try {
      const allowed = await enablePushNotifications(user, development);
      setPermission(allowed);
      if (!allowed) toast(t("notifications.permissionDenied"), "warning");
    } catch (error) {
      toast(errorMessage(error), "warning");
    }
  };
  const saveAll = () => {
    if (!current || save.isPending) return;
    try {
      save.mutate({
        ...current,
        quiet_start: toDatabaseTime(timeInput(current.quiet_start)),
        quiet_end: toDatabaseTime(timeInput(current.quiet_end)),
      });
    } catch (error) {
      toast(errorMessage(error), "warning");
    }
  };
  const toggle = (
    label: string,
    value: boolean,
    onChange: (next: boolean) => void,
  ) => (
    <View
      key={label}
      style={{
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <AppText>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );

  return (
    <Screen title={t("notifications.preferences")}>
      {development ? (
        <Card style={{ padding: 16 }}>
          <AppText>{t("notifications.signInForSettings")}</AppText>
        </Card>
      ) : preferences.error ? (
        <ErrorState
          message={preferences.error.message}
          retry={() => void preferences.refetch()}
        />
      ) : preferences.isPending || !current ? (
        <PageSkeleton shape="rows" />
      ) : (
        <>
          <Card style={{ padding: 16, gap: 10 }}>
            <AppText>{t("notifications.enablePushHint")}</AppText>
            <AppText muted>
              {permission
                ? t("notifications.permissionEnabled")
                : t("notifications.permissionDenied")}
            </AppText>
            {!permission ? (
              <AppButton
                label={t("notifications.enablePush")}
                onPress={() => void enable()}
              />
            ) : null}
            {permission === false ? (
              <AppButton
                secondary
                label={t("notificationSettings")}
                onPress={() => void Linking.openSettings()}
              />
            ) : null}
          </Card>
          <Card style={{ padding: 16, gap: 8 }}>
            {toggle(t("notifications.inApp"), current.in_app_enabled, (v) =>
              update("in_app_enabled", v),
            )}
            {toggle(
              t("notifications.reminderAlerts"),
              current.reminders_enabled,
              (v) => update("reminders_enabled", v),
            )}
            {toggle(
              t("notifications.accountUpdates"),
              current.account_updates_enabled,
              (v) => update("account_updates_enabled", v),
            )}
            {toggle(t("notifications.pushEnabled"), current.push_enabled, (v) =>
              update("push_enabled", v),
            )}
          </Card>
          <Card style={{ padding: 16, gap: 12 }}>
            <AppText>{t("notifications.language")}</AppText>
            <FilterChips
              value={current.language}
              onChange={(value) =>
                update("language", value as NotificationPreferences["language"])
              }
              items={[
                { id: "AUTO", label: t("notifications.autoLanguage") },
                { id: "en-IN", label: t("localeEnglish") },
                { id: "hi-IN", label: t("localeHindi") },
              ]}
            />
          </Card>
          <Card style={{ padding: 16, gap: 12 }}>
            {toggle(
              t("notifications.quietHours"),
              current.quiet_hours_enabled,
              (v) => update("quiet_hours_enabled", v),
            )}
            {current.quiet_hours_enabled ? (
              <>
                <InputField
                  label={t("notifications.quietStart")}
                  value={timeInput(current.quiet_start)}
                  maxLength={5}
                  onChangeText={(v) => update("quiet_start", v)}
                />
                <InputField
                  label={t("notifications.quietEnd")}
                  value={timeInput(current.quiet_end)}
                  maxLength={5}
                  onChangeText={(v) => update("quiet_end", v)}
                />
              </>
            ) : null}
            <AppText>{t("notifications.dailyLimit")}</AppText>
            <AppText muted>{t("notifications.dailyLimitHint")}</AppText>
            <FilterChips
              value={String(current.daily_push_limit)}
              onChange={(value) => update("daily_push_limit", Number(value))}
              items={[1, 3, 5, 10, 20].map((value) => ({
                id: String(value),
                label: String(value),
              }))}
            />
          </Card>
          {save.error ? (
            <ErrorState message={save.error.message} retry={saveAll} />
          ) : null}
          <AppButton
            label={t("notifications.savePreferences")}
            disabled={save.isPending}
            onPress={saveAll}
          />
        </>
      )}
    </Screen>
  );
}
