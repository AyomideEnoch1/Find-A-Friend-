import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdCarousel from "../../components/feed/AdCarousel";
import PostCard from "../../components/feed/PostCard";
import StoriesRow from "../../components/feed/StoriesRow";
import NeuralBackground from "../../components/NeuralBackground";
import ScreenLoader from "../../components/ScreenLoader";
import StoryViewer from "../../components/stories/StoryViewer";
import type { FeedPost } from "../../lib/feed";
import { getCurrentProfile, updateProfile, Profile } from "../../lib/profiles";
import { uploadFile } from "../../lib/upload";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { hideTabBar, showTabBar } from "../../lib/tabBarAnim";
import { useTheme } from "../../lib/theme";
import { typography } from "../../lib/typography";
import { useBadgesStore } from "../../store/badgesStore";
import { useFeedStore } from "../../store/feedStore";
import { useNotificationsStore } from "../../store/notificationsStore";
import { useStreakStore } from "../../store/streakStore";
import { useThemeStore } from "../../store/themeStore";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    activeTab,
    loadFeed,
    refresh,
    loadMore,
    setTab,
    setFeedMode,
  } = useFeedStore();

  const feedMode = useThemeStore((s) => s.feedMode);
  const activeUniversity = useThemeStore((s) => s.activeUniversity);
  const hydrated = useThemeStore((s) => s.hydrated);

  const { unreadCount, loadUnreadCount } = useNotificationsStore();
  const { currentStreak, hasLoaded } = useStreakStore();
  const theme = useTheme();
  const markSeen = useBadgesStore((s) => s.markSeen);

  const [firstName, setFirstName] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditingPersona, setIsEditingPersona] = useState(false);
  const [globalName, setGlobalName] = useState("");
  const [globalBio, setGlobalBio] = useState("");
  const [globalAvatar, setGlobalAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const refreshProfile = useCallback(async () => {
    const p = await getCurrentProfile();
    setProfile(p);
    if (p) {
      if (p.full_name) setFirstName(p.full_name.split(" ")[0]);
      setGlobalName(p.global_full_name || p.full_name || "");
      setGlobalBio(p.global_bio || p.bio || "");
      setGlobalAvatar(p.global_avatar_url || p.avatar_url || null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      markSeen("home");
      refreshProfile();
      if (posts.length === 0) {
        showTabBar();
      }
    }, [markSeen, posts.length, refreshProfile]),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (posts.length === 0) {
        showTabBar();
        return;
      }
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y < 50) {
        showTabBar();
        return;
      }
      if (dy > 8) hideTabBar();
      else if (dy < -8) showTabBar();
    },
    [posts.length],
  );

  const handleInstantJoin = async () => {
    if (!profile) return;
    try {
      const { error } = await updateProfile({
        joined_global_hub: true,
        global_full_name: profile.full_name || "Global User",
        global_bio: profile.bio || "",
        global_avatar_url: profile.avatar_url || null,
        global_interests: profile.interests || []
      });
      if (error) {
        const msg = typeof error === 'string' ? error : error.message;
        throw new Error(msg);
      }
      Toast.show({
        type: 'success',
        text1: 'Welcome to the Global Hub!',
        text2: 'Your profile has been created.',
      });
      await refreshProfile();
      await loadFeed();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to join");
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to gallery to pick an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0].uri) {
      setUploadingAvatar(true);
      try {
        const filename = `avatar_${Date.now()}.jpg`;
        const url = await uploadFile('profiles', `${profile?.id || 'anon'}/${filename}`, result.assets[0].uri, 'image/jpeg');
        setGlobalAvatar(url);
      } catch (err: any) {
        Alert.alert('Upload failed', err.message);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSavePersona = async () => {
    if (!globalName.trim()) {
      Alert.alert("Required", "Display name cannot be empty.");
      return;
    }
    try {
      const { error } = await updateProfile({
        joined_global_hub: true,
        global_full_name: globalName.trim(),
        global_bio: globalBio.trim(),
        global_avatar_url: globalAvatar,
        global_interests: profile?.interests || []
      });
      if (error) {
        const msg = typeof error === 'string' ? error : error.message;
        throw new Error(msg);
      }
      Toast.show({
        type: 'success',
        text1: 'Persona Created!',
        text2: 'Welcome to the Global Hub.',
      });
      setIsEditingPersona(false);
      await refreshProfile();
      await loadFeed();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to join");
    }
  };

  useEffect(() => {
    loadUnreadCount();
    refreshProfile();
  }, [loadUnreadCount, refreshProfile]);

  useEffect(() => {
    // Wait until themeStore has finished hydrating (activeUniversity resolved)
    // before loading the feed — prevents the race that shows global posts
    // while still in local mode on first launch.
    if (!hydrated) return
    loadFeed();
  }, [loadFeed, hydrated, activeUniversity?.id]);

  useEffect(() => {
    if (!loading) {
      showTabBar();
    }
  }, [loading]);

  const handleRefresh = useCallback(() => refresh(), [refresh]);
  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) loadMore();
  }, [loading, hasMore, loadMore]);

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => <PostCard post={item} />,
    [],
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* StoriesRow only appears on the Following tab */}
        {activeTab === 'following' && <StoriesRow />}
      </View>
    ),
    [activeTab],
  );

  const renderFooter = useCallback(
    () =>
      loading && posts.length > 0 ? (
        <ActivityIndicator
          color={theme.accent}
          style={{ paddingVertical: 20 }}
        />
      ) : null,
    [loading, posts.length, theme.accent],
  );

  const renderEmpty = useCallback(
    () =>
      !loading ? (
        <View style={s.empty}>
          <Ionicons
            name="newspaper-outline"
            size={48}
            color={theme.textFaint}
          />
          <Text style={[s.emptyTitle, { color: theme.text }]}>
            Nothing here yet
          </Text>
          <Text style={[s.emptyText, { color: theme.textMuted }]}>
            Be the first to post on campus!
          </Text>
          <TouchableOpacity
            style={[s.emptyBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push("/create-post" as any)}
          >
            <Text style={s.emptyBtnText}>Create first post</Text>
          </TouchableOpacity>
        </View>
      ) : null,
    [loading, theme],
  );

  const header = (
    <View style={[s.header, { borderBottomColor: theme.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 32, height: 32, marginBottom: 2 }}
            resizeMode="contain"
          />
          {feedMode === 'global' ? (
            <TouchableOpacity
              style={[
                s.compactReturnBtn,
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}
              onPress={() => setFeedMode('local')}
            >
              <Ionicons name="school-outline" size={14} color={theme.accent} style={{ marginRight: 4 }} />
              <Text style={[s.compactReturnText, { color: theme.text }]}>
                Return to Campus
              </Text>
            </TouchableOpacity>
          ) : (
            firstName && (
              <Text style={[s.greeting, { color: theme.textMuted, marginLeft: 8 }]}>
                {getGreeting()}, {firstName} 👋
              </Text>
            )
          )}
        </View>
      </View>
      {/* Compact Global Hub chip — shown inline in header when in local mode */}
      {feedMode === 'local' && activeUniversity && (
        <TouchableOpacity
          style={[
            s.compactReturnBtn,
            { backgroundColor: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.35)' }
          ]}
          onPress={() => setFeedMode('global')}
        >
          <Text style={{ fontSize: 13, marginRight: 3 }}>🌐</Text>
          <Text style={[s.compactReturnText, { color: theme.accent }]}>
            Global Hub
          </Text>
        </TouchableOpacity>
      )}
      <View style={s.headerRight}>
        {Platform.OS !== "android" && (
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: theme.card }]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Ionicons name="refresh" size={20} color={theme.text} />
            )}
          </TouchableOpacity>
        )}

        <View
          style={[
            s.streakBadge,
            {
              backgroundColor: "rgba(249, 115, 22, 0.12)",
              height: 44,
              paddingHorizontal: 12,
              borderRadius: 22,
            },
          ]}
        >
          <Ionicons name="flame" size={18} color="#f97316" />
          <Text style={[s.streakText, { fontSize: 14 }]}>
            {currentStreak ?? 0}
          </Text>
        </View>

        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: theme.card }]}
          onPress={() => router.push("/notifications" as any)}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.text} />
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );

  const renderGlobalHubGate = () => {
    if (isEditingPersona) {
      return (
        <ScrollView contentContainerStyle={s.gateScroll} keyboardShouldPersistTaps="handled">
          <View style={s.gateCard}>
            <Text style={s.gateTitle}>Customize Global Profile</Text>
            <Text style={s.gateSubtitle}>Create a unique persona for the Global Hub</Text>
            
            <View style={s.avatarContainer}>
              <TouchableOpacity onPress={handlePickAvatar} style={s.avatarBtn} disabled={uploadingAvatar}>
                {globalAvatar ? (
                  <Image source={{ uri: globalAvatar }} style={s.gateAvatar} />
                ) : (
                  <View style={s.gateAvatarFallback}>
                    <Ionicons name="person" size={40} color={theme.textMuted} />
                  </View>
                )}
                {uploadingAvatar ? (
                  <View style={s.avatarOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : (
                  <View style={s.avatarEditBadge}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={s.avatarLabel}>Upload Profile Picture</Text>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>DISPLAY NAME</Text>
              <TextInput
                style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card2 }]}
                value={globalName}
                onChangeText={setGlobalName}
                placeholder="Enter display name"
                placeholderTextColor={theme.textFaint}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>GLOBAL BIO</Text>
              <TextInput
                style={[s.input, s.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card2 }]}
                value={globalBio}
                onChangeText={setGlobalBio}
                placeholder="Tell the global community about yourself..."
                placeholderTextColor={theme.textFaint}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleSavePersona}>
              <Text style={s.primaryBtnText}>Save & Join Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.secondaryBtn} onPress={() => setIsEditingPersona(false)}>
              <Text style={s.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView contentContainerStyle={s.gateScroll}>
        <View style={s.gateCard}>
          <View style={s.gateIconContainer}>
            <Ionicons name="planet" size={60} color="#c084fc" />
          </View>
          <Text style={s.gateTitle}>Welcome to the Global Hub</Text>
          <Text style={s.gateSubtitle}>
            A central space interconnecting all independent campus communities. Discover and interact with students everywhere!
          </Text>

          {/* Option 1: Instant Join */}
          <TouchableOpacity style={s.optionCard} onPress={handleInstantJoin}>
            <View style={s.optionIconBg}>
              <Ionicons name="copy-outline" size={24} color="#a78bfa" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionTitle}>Use Campus Profile</Text>
              <Text style={s.optionDesc}>
                Instantly copy your full name, bio, and avatar from your local university profile to join.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textFaint} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Option 2: Custom Persona */}
          <TouchableOpacity style={s.optionCard} onPress={() => setIsEditingPersona(true)}>
            <View style={s.optionIconBg}>
              <Ionicons name="create-outline" size={24} color="#c084fc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionTitle}>Create Custom Persona</Text>
              <Text style={s.optionDesc}>
                Set up a new display name, bio, and avatar unique to the Global Hub.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textFaint} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  if (loading && !posts.length) {
    return <ScreenLoader message="Loading feed..." />;
  }

  if (error && !posts.length) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={s.loadingWrap}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color="rgba(239,68,68,0.6)"
          />
          <Text style={[s.errorText, { color: theme.textMuted }]}>
            Failed to load feed
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: theme.accent }]}
            onPress={loadFeed}
          >
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[s.container, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      <NeuralBackground intensity="light" />
      {header}


      {feedMode === 'global' && profile && !profile.joined_global_hub ? (
        renderGlobalHubGate()
      ) : (
        <>
          <View style={[s.tabs, { borderBottomColor: theme.border }]}>
            <TouchableOpacity style={s.tab} onPress={() => setTab("forYou")}>
              {activeTab === "forYou" ? (
                <View
                  style={[
                    s.tabPill,
                    {
                      backgroundColor: theme.accentBg,
                      borderColor: theme.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[s.tabText, { color: theme.accent, fontWeight: "700" }]}
                  >
                    For You
                  </Text>
                </View>
              ) : (
                <Text style={[s.tabText, { color: theme.textMuted }]}>For You</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.tab} onPress={() => setTab("following")}>
              {activeTab === "following" ? (
                <View
                  style={[
                    s.tabPill,
                    {
                      backgroundColor: theme.accentBg,
                      borderColor: theme.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[s.tabText, { color: theme.accent, fontWeight: "700" }]}
                  >
                    Following
                  </Text>
                </View>
              ) : (
                <Text style={[s.tabText, { color: theme.textMuted }]}>
                  Following
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <AdCarousel />
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.accent}
                colors={[theme.accent]}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
          />

          <TouchableOpacity
            style={[s.fab, { backgroundColor: theme.accent }]}
            onPress={() => router.push("/create-post" as any)}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      <StoryViewer />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  logo: {
    fontSize: 24,
    fontFamily: typography.fontExtraBold,
    color: "#a78bfa",
    letterSpacing: 1,
  },
  greeting: { fontSize: 12, fontFamily: typography.fontMedium, marginTop: 1 },
  compactReturnBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.5,
    marginLeft: 10,
  },
  compactReturnText: {
    fontSize: 12,
    fontFamily: typography.fontSemiBold,
  },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: "#fff", fontWeight: "700" },
  tabs: { flexDirection: "row", borderBottomWidth: 0.5 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  tabText: { fontSize: 12, fontFamily: typography.fontMedium },
  tabPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 5,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    color: "#f97316",
    fontSize: 13,
    fontFamily: typography.fontBold,
  },
  listContent: { paddingBottom: 148 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13 },
  errorText: { fontSize: 14, marginTop: 8 },
  retryBtn: {
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontFamily: typography.fontSemiBold },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: typography.fontRegular,
  },
  emptyBtn: {
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  fab: {
    position: "absolute",
    bottom: 108,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  toggleTrack: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  toggleBtnText: {
    fontSize: 13,
    fontFamily: typography.fontSemiBold,
  },
  gateScroll: {
    padding: 20,
    paddingBottom: 60,
    justifyContent: "center",
  },
  gateCard: {
    backgroundColor: "rgba(25, 10, 55, 0.45)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.25)",
    padding: 24,
    alignItems: "center",
    shadowColor: "#c084fc",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
    marginTop: 20,
  },
  gateIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(192, 132, 252, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(192, 132, 252, 0.25)",
  },
  gateTitle: {
    fontSize: 22,
    fontFamily: typography.fontBold,
    color: "#f5f3ff",
    textAlign: "center",
    marginBottom: 10,
  },
  gateSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontRegular,
    color: "rgba(207, 198, 245, 0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    width: "100%",
  },
  optionIconBg: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: typography.fontSemiBold,
    color: "#f5f3ff",
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: typography.fontRegular,
    color: "rgba(207, 198, 245, 0.65)",
    lineHeight: 16,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: "relative",
  },
  gateAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  gateAvatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#a78bfa",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0f0b25",
  },
  avatarLabel: {
    fontSize: 12,
    fontFamily: typography.fontMedium,
    color: "rgba(207, 198, 245, 0.6)",
    marginTop: 8,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: typography.fontBold,
    color: "#a78bfa",
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: typography.fontRegular,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#a78bfa",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#0f0b25",
    fontSize: 15,
    fontFamily: typography.fontBold,
  },
  secondaryBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "rgba(207, 198, 245, 0.8)",
    fontSize: 14,
    fontFamily: typography.fontSemiBold,
  },
});
