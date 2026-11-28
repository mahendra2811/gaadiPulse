import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, View } from "react-native";
import {
  AppButton,
  AppText,
  Card,
  ErrorState,
  Screen,
} from "@/src/components/ui";
import { PageSkeleton } from "@/src/components/ui/PageSkeleton";
import type { ListRenderItem } from "@shopify/flash-list";
import { formatDate, getLocale, t } from "@/src/lib/i18n";
import { useAccountId, useSession } from "@/src/features/auth/session";
import { useProfile } from "@/src/features/auth/profile";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationPageSize,
  readNotifications,
  unreadNotificationCount,
} from "./api";
import type { AppNotification } from "./schema";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/src/lib/theme";

const feedKey = (user: string | null) => [user, "notification-inbox"] as const;
const countKey = (user: string | null) =>
  [user, "notification-unread-count"] as const;

function notificationRoute(row: AppNotification) {
  const route = row.route_data;
  const kind = route.kind;
  const id = route.record_id;
  const vehicle = route.vehicle_id;
  if (
    typeof kind !== "string" ||
    !["reminders", "documents", "expenses"].includes(kind) ||
    typeof id !== "string" ||
    typeof vehicle !== "string"
  )
    return;
  router.push({
    pathname: "/records/[kind]/[action]",
    params: { kind, action: id, vehicle },
  });
}

export function NotificationCenter() {
  const user = useAccountId();
  const { development } = useSession();
  const profile = useProfile();
  const client = useQueryClient();
  const colors = useTheme();
  const hindi = (profile.data?.locale ?? getLocale()).startsWith("hi");
  const feed = useInfiniteQuery({
    queryKey: feedKey(user),
    enabled: !!user && !development,
    initialPageParam: 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: ({ pageParam, signal }) => readNotifications(pageParam, signal),
    getNextPageParam: (last, pages) =>
      last.length === notificationPageSize
        ? pages.reduce((total, page) => total + page.length, 0)
        : undefined,
  });
  const unread = useQuery({
    queryKey: countKey(user),
    enabled: !!user && !development,
    queryFn: unreadNotificationCount,
    staleTime: 15_000,
  });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: feedKey(user) }),
        client.invalidateQueries({ queryKey: countKey(user) }),
      ]);
    },
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: feedKey(user) }),
        client.invalidateQueries({ queryKey: countKey(user) }),
      ]);
    },
  });
  const rows = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const open = useCallback(
    (row: AppNotification) => {
      const afterRead = () => notificationRoute(row);
      if (row.read_at || markRead.isPending) afterRead();
      else
        void markRead
          .mutateAsync(row.id)
          .then(afterRead)
          .catch(() => {});
    },
    [markRead],
  );
  const renderItem: ListRenderItem<AppNotification> = useCallback(
    ({ item }) => {
      const title = hindi ? item.title_hi : item.title_en;
      const body = hindi ? item.body_hi : item.body_en;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${body}`}
          accessibilityState={{ selected: !item.read_at }}
          onPress={() => open(item)}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <Card style={{ padding: 16, minHeight: 88, gap: 8 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Ionicons
                name={
                  item.category === "REMINDER"
                    ? "notifications"
                    : "information-circle"
                }
                size={22}
                color={item.read_at ? colors.muted : colors.primary}
              />
              <View style={{ flex: 1 }}>
                <AppText>{title}</AppText>
              </View>
              {!item.read_at ? (
                <View
                  accessibilityLabel={t("notifications.unread")}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.primary,
                  }}
                />
              ) : null}
            </View>
            <AppText muted>{body}</AppText>
            <AppText muted>
              {formatDate(new Date(item.created_at), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </AppText>
          </Card>
        </Pressable>
      );
    },
    [colors.muted, colors.primary, hindi, open],
  );
  const footer = feed.hasNextPage ? (
    <View style={{ paddingTop: 12 }}>
      <AppButton
        secondary
        label={t("notifications.loadMore")}
        disabled={feed.isFetchingNextPage}
        onPress={() => void feed.fetchNextPage()}
      />
    </View>
  ) : null;

  return (
    <Screen title={t("notifications.center")} scrollable={false}>
      <View style={{ flex: 1, minHeight: 0, gap: 12 }}>
        {!development && (unread.data ?? 0) > 0 ? (
          <AppButton
            secondary
            label={t("notifications.markAllRead")}
            disabled={markAll.isPending}
            onPress={() => markAll.mutate()}
          />
        ) : null}
        {development ? (
          <Card style={{ padding: 16 }}>
            <AppText>{t("notifications.signInForInbox")}</AppText>
          </Card>
        ) : null}
        {feed.error ? (
          <ErrorState
            message={feed.error.message}
            retry={() => void feed.refetch()}
          />
        ) : null}
        {feed.isPending && !development ? <PageSkeleton shape="rows" /> : null}
        {!feed.isPending && !feed.error && !rows.length && !development ? (
          <Card style={{ padding: 18 }}>
            <AppText>{t("notifications.empty")}</AppText>
          </Card>
        ) : null}
        {rows.length ? (
          <FlashList
            data={rows}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 12 }}
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage)
                void feed.fetchNextPage();
            }}
            onEndReachedThreshold={0.35}
            refreshing={feed.isRefetching}
            onRefresh={() => void feed.refetch()}
            ListFooterComponent={footer}
          />
        ) : null}
      </View>
    </Screen>
  );
}
