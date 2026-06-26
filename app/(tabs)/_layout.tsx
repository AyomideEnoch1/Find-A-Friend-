import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { showTabBar, tabBarTranslateY } from "../../lib/tabBarAnim";
import { glowShadow, useTheme } from "../../lib/theme";
import { useBadgesStore } from "../../store/badgesStore";
import { useNotificationsStore } from "../../store/notificationsStore";
import { useAuthStore } from "../../store/authStore";
import { useFeedStore } from "../../store/feedStore";
import { useThemeStore } from "../../store/themeStore";

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: string;
  color: string;
  size: number;
  focused: boolean;
}) {
  let iconName: any = name;
  if (name === "home") {
    iconName = focused ? "home" : "home-outline";
  } else if (name === "search") {
    iconName = focused ? "compass" : "compass-outline";
  } else if (name === "calendar") {
    iconName = focused ? "calendar" : "calendar-outline";
  } else if (name === "chatbubbles") {
    iconName = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
  } else if (name === "grid") {
    iconName = focused ? "grid" : "grid-outline";
  }

  return (
    <View style={styles.iconWrap}>
      <Ionicons name={iconName} size={size} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const { counts, syncCounts } = useBadgesStore();

  const authLoading = useAuthStore((s) => s.loading);
  const feedLoading = useFeedStore((s) => s.loading);
  const postsCount = useFeedStore((s) => s.posts.length);
  const themeHydrated = useThemeStore((s) => s.hydrated);

  const shouldHideTabBar =
    authLoading || !themeHydrated || (feedLoading && postsCount === 0);

  useEffect(() => {
    syncCounts();

    // Real-time subscriptions to trigger syncCounts on new inserts immediately
    const tables = [
      "posts",
      "events",
      "clubs",
      "messages",
      "study_groups",
      "anonymous_posts",
      "vendors",
      "game_sessions",
    ];

    const channels = tables.map((table) => {
      return supabase
        .channel(`realtime-badges-${table}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table },
          () => {
            syncCounts();
          },
        )
        .subscribe();
    });

    return () => {
      // channels.forEach(ch => supabase.removeChannel(ch))
    };
  }, [syncCounts]);

  return (
    <Tabs
      screenListeners={{ tabPress: () => showTabBar() }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : theme.cardSolid,
          borderTopColor: "rgba(167,139,250,0.25)",
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
          elevation: 0,
          transform: [{ translateY: tabBarTranslateY }],
          display: shouldHideTabBar ? "none" : "flex",
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint={theme.dark ? "dark" : "light"}
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
          tabBarBadge:
            counts?.home > 0
              ? counts.home > 9
                ? "9+"
                : counts.home
              : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="search"
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarBadge:
            counts?.discover > 0
              ? counts.discover > 9
                ? "9+"
                : counts.discover
              : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="calendar"
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarBadge:
            counts?.events > 0
              ? counts.events > 9
                ? "9+"
                : counts.events
              : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="chatbubbles"
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarBadge:
            counts?.chat > 0
              ? counts.chat > 9
                ? "9+"
                : counts.chat
              : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          href: null,
          title: "More",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="grid" color={color} size={size} focused={focused} />
          ),
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 9
                ? "9+"
                : unreadCount
              : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10 },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#a78bfa",
    ...glowShadow,
  },
});

