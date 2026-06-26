import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as React from "react";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { supportsVideoStories } from "../../lib/featureFlags";
import type { FeedPost } from "../../lib/feed";
import { reportPost } from "../../lib/feed";
import { getInitials, getTimeAgo } from "../../lib/matching";
import { createStory } from "../../lib/stories";
import { useTheme } from "../../lib/theme";
import { typography } from "../../lib/typography";
import { useFeedStore } from "../../store/feedStore";
import VerifiedBadge from "../ui/VerifiedBadge";

import { useThemeStore } from "../../store/themeStore";
import { supabase } from "../../lib/supabase";

interface PostCardProps {
  post: FeedPost;
}

function toHandle(name: string | null | undefined): string {
  if (!name) return "@user";
  return "@" + name.toLowerCase().replace(/\s+/g, "");
}

export default function PostCard({ post }: PostCardProps) {
  const { toggleLike, toggleBookmark, repostPost, deletePost } = useFeedStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const theme = useTheme();
  const feedMode = useThemeStore((s) => s.feedMode);

  React.useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }: any) => setMyUserId(data.user?.id ?? null));
  }, []);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize <= 0) return;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
    }
  };

  // Check this  out
  const onContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  let images: string[] = [];
  if (post.image_url) {
    if (post.image_url.startsWith("[")) {
      try {
        images = JSON.parse(post.image_url);
      } catch {
        images = [post.image_url];
      }
    } else {
      images = [post.image_url];
    }
  }

  const isAnon = post.is_anonymous;
  const isGlobalPost = (post as any).posted_to_global_hub;
  const rawName = isAnon
    ? "Anonymous"
    : isGlobalPost
      ? (post.profiles as any)?.global_full_name ||
        post.profiles?.full_name ||
        "User"
      : (post.profiles?.full_name ?? "User");
  const displayName = rawName;
  const handle = isAnon ? "@anonymous" : toHandle(rawName);

  const rawAvatarUrl = isAnon
    ? null
    : isGlobalPost
      ? (post.profiles as any)?.global_avatar_url || post.profiles?.avatar_url
      : post.profiles?.avatar_url;

  const isRepost = !!(post.repost_of && post.original_post);
  const orig = post.original_post;
  const isOrigGlobal = orig ? (orig as any).posted_to_global_hub : false;

  const origName = orig
    ? orig.is_anonymous
      ? "Anonymous"
      : isOrigGlobal
        ? (orig.profiles as any)?.global_full_name ||
          orig.profiles?.full_name ||
          "User"
        : (orig.profiles?.full_name ?? "User")
    : "User";

  const origAvatarUrl = orig
    ? orig.is_anonymous
      ? null
      : isOrigGlobal
        ? (orig.profiles as any)?.global_avatar_url || orig.profiles?.avatar_url
        : orig.profiles?.avatar_url
    : null;

  let quoteText = post.body ?? "";
  if (isRepost && quoteText.startsWith("[Repost]")) {
    quoteText = "";
  }

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id);
  };
  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(post.id);
  };
  const handleComment = () => router.push(`/post/${post.id}` as any);
  const handleRepost = () => {
    Alert.alert("Repost", "Repost this to your feed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Repost",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const { error } = await repostPost(post.id);
          if (error)
            Toast.show({
              type: "error",
              text1: "Repost failed",
              text2: error.message,
            });
          else
            Toast.show({
              type: "success",
              text1: "Reposted!",
              text2: "Added to your feed",
            });
        },
      },
    ]);
  };
  const handleAddToStory = async () => {
    if (post.image_url) {
      const { error } = await createStory({
        mediaUrl: post.image_url,
        mediaType: "image",
        caption: post.body?.slice(0, 150),
        durationSecs: 5,
      });
      if (error)
        Toast.show({ type: "error", text1: "Error", text2: error.message });
      else
        Toast.show({
          type: "success",
          text1: "Added!",
          text2: "Post shared to your story",
        });
    } else {
      router.push("/create-story" as any);
    }
  };
  const handleShare = () => {
    Alert.alert("Share", undefined, [
      { text: "Add to Story", onPress: handleAddToStory },
      {
        text: "Share externally",
        onPress: async () => {
          try {
            await Share.share({ message: `${post.body}\n\n— via FAF` });
          } catch {}
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const handleMore = () => {
    const isOwn = myUserId && post.author_id === myUserId;
    Alert.alert(
      "Options",
      undefined,
      isOwn
        ? [
            {
              text: "Delete post",
              style: "destructive",
              onPress: () => {
                Alert.alert("Delete post", "This cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      const { error } = await deletePost(post.id);
                      if (error)
                        Toast.show({
                          type: "error",
                          text1: "Delete failed",
                          text2: error.message,
                        });
                      else
                        Toast.show({
                          type: "success",
                          text1: "Deleted",
                          text2: "Your post was removed",
                        });
                    },
                  },
                ]);
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        : [
            {
              text: "Report post",
              style: "destructive",
              onPress: () => {
                Alert.alert(
                  "Report post",
                  "Report this content as inappropriate?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Report",
                      style: "destructive",
                      onPress: async () => {
                        const { error } = await reportPost(post.id);
                        if (error)
                          Toast.show({
                            type: "error",
                            text1: "Report failed",
                            text2: error.message,
                          });
                        else
                          Toast.show({
                            type: "success",
                            text1: "Reported",
                            text2: "Thanks for keeping FAF safe",
                          });
                      },
                    },
                  ],
                );
              },
            },
            { text: "Cancel", style: "cancel" },
          ],
    );
  };
  const handleAuthorPress = () => {
    if (!isAnon && post.author_id)
      router.push(`/profile/${post.author_id}` as any);
  };

  const handleOrigPress = () => {
    if (orig) {
      router.push(`/post/${orig.id}` as any);
    }
  };

  const renderBody = (
    text: string | null | undefined,
    isRepostText = false,
  ) => {
    const regex =
      /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}|\b[a-zA-Z0-9.-]+\.(?:com|org|net|edu|gov|ng|io|co|me|info|biz|uk|ca|de|jp|fr|au|us|ru|ch|it|nl|se|no|es|mil)\b(?:\/[^\s]*)?|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/gi;
    const parts = (text || "").split(regex);
    return (
      <Text
        style={[isRepostText ? s.repostBody : s.body, { color: theme.text }]}
      >
        {parts.map((part, i) => {
          if (part.startsWith("#"))
            return (
              <Text
                key={i}
                style={{ color: theme.accent }}
                onPress={() => router.push(`/hashtag/${part.slice(1)}` as any)}
              >
                {part}
              </Text>
            );
          if (part.startsWith("@"))
            return (
              <Text key={i} style={{ color: theme.accent }}>
                {part}
              </Text>
            );
          if (
            part.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/i)
          ) {
            return (
              <Text
                key={i}
                style={{ color: theme.accent, textDecorationLine: "underline" }}
                onPress={() => {
                  if (Platform.OS !== "web")
                    Linking.openURL(`mailto:${part}`).catch(() => {});
                }}
                {...(Platform.OS === "web"
                  ? ({
                      href: `mailto:${part}`,
                      accessibilityRole: "link",
                      target: "_blank",
                    } as any)
                  : {})}
              >
                {part}
              </Text>
            );
          }
          if (
            part.match(/^https?:\/\//i) ||
            part.match(/^www\./i) ||
            part.match(
              /^[a-zA-Z0-9.-]+\.(?:com|org|net|edu|gov|ng|io|co|me|info|biz|uk|ca|de|jp|fr|au|us|ru|ch|it|nl|se|no|es|mil)/i,
            )
          ) {
            const url = part.match(/^https?:\/\//i) ? part : `https://${part}`;
            return (
              <Text
                key={i}
                style={{ color: theme.accent, textDecorationLine: "underline" }}
                onPress={() => {
                  if (Platform.OS !== "web")
                    Linking.openURL(url).catch(() => {});
                }}
                {...(Platform.OS === "web"
                  ? ({
                      href: url,
                      accessibilityRole: "link",
                      target: "_blank",
                    } as any)
                  : {})}
              >
                {part}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <Pressable
      style={[
        s.card,
        isGlobalPost
          ? {
              borderColor: "rgba(124, 58, 237, 0.35)",
              backgroundColor: "rgba(25, 10, 55, 0.5)",
              borderWidth: 1.5,
            }
          : { borderColor: theme.border, backgroundColor: theme.card },
        !isGlobalPost && theme.cardShadow,
      ]}
      onPress={() => router.push(`/post/${post.id}` as any)}
      android_ripple={{ color: "rgba(167,139,250,0.08)" }}
    >
      {/* Subtle top-edge tint */}
      <View style={s.cardGradient} pointerEvents="none" />

      {isRepost && (
        <View style={s.repostHeaderRow}>
          <Ionicons name="repeat-outline" size={14} color={theme.textMuted} />
          <Text style={[s.repostHeaderText, { color: theme.textMuted }]}>
            {displayName} reposted
          </Text>
        </View>
      )}

      {/* ── Avatar row: only author info + body text ─────────────────────── */}
      {/* s.row */}
      <View
        style={[
          s.row,
          isRepost && {
            paddingTop: 6,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleAuthorPress}
          disabled={isAnon}
          style={s.avatarCol}
        >
          <View
            style={[
              s.avatarRing,
              { borderColor: isAnon ? theme.border : theme.accentBorder },
            ]}
          >
            {!isAnon && rawAvatarUrl ? (
              <Image source={{ uri: rawAvatarUrl }} style={s.avatar} />
            ) : (
              <View
                style={[s.avatarFallback, { backgroundColor: theme.cardSolid }]}
              >
                {isAnon ? (
                  <Ionicons
                    name="eye-off-outline"
                    size={17}
                    color={theme.textMuted}
                  />
                ) : (
                  <Text style={s.avatarText}>
                    {getInitials(rawName ?? "U")}
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={s.content}>
          {/* Author / meta row */}
          <View style={s.authorRow}>
            <TouchableOpacity
              onPress={handleAuthorPress}
              disabled={isAnon}
              style={{ flex: 1 }}
            >
              <View style={s.nameRow}>
                <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {!isAnon && (
                  <VerifiedBadge
                    type={post.profiles?.badge_type}
                    customColor={post.profiles?.badge_color}
                    size={14}
                  />
                )}
                {!isAnon && feedMode === "global" && post.profiles?.universities && (
                  <View
                    style={[
                      s.uniBadge,
                      {
                        backgroundColor: `${post.profiles.universities.primary_color}15`,
                        borderColor: `${post.profiles.universities.primary_color}45`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.uniBadgeText,
                        { color: post.profiles.universities.primary_color },
                      ]}
                    >
                      {post.profiles.universities.short_name}
                    </Text>
                  </View>
                )}
                {!isAnon &&
                  (!post.profiles?.badge_type ||
                    post.profiles.badge_type === "none") &&
                  post.profiles?.role === "admin" && (
                    <View
                      style={[
                        s.badge,
                        {
                          backgroundColor: "rgba(167,139,250,0.1)",
                          borderColor: "rgba(167,139,250,0.35)",
                        },
                      ]}
                    >
                      <Text style={[s.badgeText, { color: theme.accent }]}>
                        👑 Admin
                      </Text>
                    </View>
                  )}
                {post.post_type === "academic" && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>Academic</Text>
                  </View>
                )}
                {post.post_type === "club" && (
                  <TouchableOpacity
                    style={[
                      s.badge,
                      s.badgeClub,
                      { flexDirection: "row", alignItems: "center" },
                    ]}
                    onPress={() => {
                      if (post.club_id)
                        router.push(`/club/${post.club_id}` as any);
                    }}
                  >
                    <Text style={[s.badgeText, { color: theme.accent }]}>
                      ♣ {post.clubs?.name || "Club"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text
                style={[s.meta, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {handle} · {getTimeAgo(post.created_at)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMore}
              style={s.moreBtn}
              hitSlop={12}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={16}
                color={theme.textFaint}
              />
            </TouchableOpacity>
          </View>

          <View
        
      >
        <Text>
          {/* Post body text */}
          {quoteText ? renderBody(quoteText) : null}
        </Text>
      </View>
        </View>
      </View>

      

      {/* ── Full-width media (images / video) ──────────────────────────────
           Outside the avatar row so there is no left offset. */}
      {images.length > 0 && !isRepost ? (
        <View style={s.mediaSection}>
          {images.length === 1 ? (
            images[0].match(/\.(mp4|mov|webm|m4v|3gp)$/i) ? (
              <Pressable onPress={(e) => e.stopPropagation()}>
                <InlineVideoPlayer
                  sourceUrl={images[0]}
                  borderRadius={12}
                  borderColor={theme.border}
                />
              </Pressable>
            ) : (
              <TouchableOpacity
                onPress={() => setSelectedImage(images[0])}
                activeOpacity={0.95}
              >
                <Image
                  source={{ uri: images[0] }}
                  style={[
                    s.media,
                    { borderColor: theme.border, width: "100%" },
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )
          ) : (
            /* Multi-image carousel — fixed height is fine here since
               the user is swiping through mixed media */
            <View style={{ marginBottom: 10 }}>
              <View
                onLayout={onContainerLayout}
                style={{
                  position: "relative",
                  width: "100%",
                  height: 240,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 0.5,
                  borderColor: theme.border,
                }}
              >
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  style={{ width: "100%", height: "100%" }}
                >
                  {images.map((imgUrl, idx) => {
                    const isVideo = !!imgUrl.match(
                      /\.(mp4|mov|webm|m4v|3gp)$/i,
                    );
                    return (
                      <View
                        key={idx}
                        style={{ width: containerWidth || 300, height: "100%" }}
                      >
                        {isVideo ? (
                          <Pressable
                            onPress={(e) => e.stopPropagation()}
                            style={{ flex: 1 }}
                          >
                            <InlineVideoPlayer sourceUrl={imgUrl} />
                          </Pressable>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.95}
                            onPress={() => setSelectedImage(imgUrl)}
                            style={{ width: "100%", height: "100%" }}
                          >
                            <Image
                              source={{ uri: imgUrl }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
                <View
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      fontFamily: typography.fontMedium,
                    }}
                  >
                    {activeIndex + 1}/{images.length}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 8,
                  gap: 5,
                }}
              >
                {images.map((_, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: activeIndex === idx ? 6 : 4,
                      height: activeIndex === idx ? 6 : 4,
                      borderRadius: 3,
                      backgroundColor:
                        activeIndex === idx ? theme.accent : theme.textFaint,
                    }}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* ── Full-width repost nested card ────────────────────────────────── */}
      {isRepost && orig ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            s.repostCard,
            {
              borderColor: theme.border,
              backgroundColor: "rgba(255,255,255,0.015)",
            },
          ]}
          onPress={handleOrigPress}
        >
          <View style={s.repostCardHeader}>
            <View
              style={[
                s.repostAvatarRing,
                {
                  borderColor: orig.is_anonymous
                    ? theme.border
                    : theme.accentBorder,
                },
              ]}
            >
              {!orig.is_anonymous && origAvatarUrl ? (
                <Image source={{ uri: origAvatarUrl }} style={s.repostAvatar} />
              ) : (
                <View
                  style={[
                    s.repostAvatarFallback,
                    { backgroundColor: theme.cardSolid },
                  ]}
                >
                  {orig.is_anonymous ? (
                    <Ionicons
                      name="eye-off-outline"
                      size={10}
                      color={theme.textMuted}
                    />
                  ) : (
                    <Text style={[s.repostAvatarText, { color: theme.accent }]}>
                      {getInitials(origName ?? "U")}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <View style={s.repostMetaRow}>
              <Text
                style={[s.repostAuthorName, { color: theme.text }]}
                numberOfLines={1}
              >
                {orig.is_anonymous ? "Anonymous" : origName}
              </Text>
              <Text
                style={[s.repostAuthorHandle, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {orig.is_anonymous ? "@anonymous" : toHandle(origName)}
              </Text>
              <Text style={[s.repostAuthorHandle, { color: theme.textFaint }]}>
                · {getTimeAgo(orig.created_at)}
              </Text>
            </View>
          </View>
          {orig.body ? renderBody(orig.body, true) : null}
          {orig.image_url ? (
            orig.image_url.match(/\.(mp4|mov|webm|m4v|3gp)$/i) ? (
              <Pressable onPress={(e) => e.stopPropagation()}>
                <InlineVideoPlayer
                  sourceUrl={orig.image_url!}
                  borderRadius={8}
                  borderColor={theme.border}
                />
              </Pressable>
            ) : (
              <Image
                source={{ uri: orig.image_url }}
                style={[s.repostMedia, { borderColor: theme.border }]}
                resizeMode="cover"
              />
            )
          ) : null}
        </TouchableOpacity>
      ) : null}

      {/* ── Actions row — always the last element in the card ───────────── */}
      <View style={s.actions}>
        <Action
          icon="chatbubble-outline"
          count={post.comments_count}
          onPress={handleComment}
          activeColor={theme.cyan}
          inactiveColor={theme.textMuted}
        />
        <Action
          icon="repeat-outline"
          count={post.repost_count ?? 0}
          onPress={handleRepost}
          activeColor="#34d399"
          inactiveColor={theme.textMuted}
        />
        <Action
          icon={post.is_liked ? "heart" : "heart-outline"}
          count={post.likes_count}
          onPress={handleLike}
          active={post.is_liked}
          activeColor="#f472b6"
          inactiveColor={theme.textMuted}
        />
        <Action
          icon={post.is_bookmarked ? "bookmark" : "bookmark-outline"}
          onPress={handleBookmark}
          active={post.is_bookmarked}
          activeColor={theme.accent}
          inactiveColor={theme.textMuted}
        />
        <Action
          icon="share-outline"
          onPress={handleShare}
          activeColor={theme.accent}
          inactiveColor={theme.textMuted}
        />
      </View>

      {selectedImage ? (
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <Pressable style={s.imgModal} onPress={() => setSelectedImage(null)}>
            <Image
              source={{ uri: selectedImage }}
              style={s.imgModalImg}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
    </Pressable>
  );
}

interface ActionProps {
  icon: string;
  count?: number;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

function Action({
  icon,
  count,
  onPress,
  active,
  activeColor = "#a78bfa",
  inactiveColor,
}: ActionProps) {
  const theme = useTheme();
  const resolvedInactiveColor = inactiveColor || theme.textMuted;
  return (
    <TouchableOpacity style={s.actionBtn} onPress={onPress} hitSlop={12}>
      <View
        style={active ? [s.activeIconWrap, { shadowColor: activeColor }] : null}
      >
        <Ionicons
          name={icon as any}
          size={17}
          color={active ? activeColor : resolvedInactiveColor}
        />
      </View>
      {count !== undefined && count > 0 ? (
        <Text
          style={[
            s.actionCount,
            { color: active ? activeColor : resolvedInactiveColor },
          ]}
        >
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(167,139,250,0.05)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  avatarCol: { marginRight: 12, paddingTop: 2 },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    padding: 1.5,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 21 },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: typography.fontBold,
    color: "#c4b5fd",
  },
  content: { flex: 1, paddingBottom: 10 },
  authorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: { fontSize: 15, fontFamily: typography.fontBold },
  badge: {
    backgroundColor: "rgba(96,165,250,0.12)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "rgba(96,165,250,0.25)",
  },
  badgeClub: {
    backgroundColor: "rgba(167,139,250,0.1)",
    borderColor: "rgba(167,139,250,0.25)",
  },
  badgeText: {
    fontSize: 9,
    fontFamily: typography.fontSemiBold,
    color: "#60a5fa",
  },
  meta: { fontSize: 12, fontFamily: typography.fontRegular, marginTop: 1 },
  moreBtn: { padding: 4, marginLeft: 4 },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: typography.fontRegular,
    marginBottom: 10,
  },
  media: {
    width: "100%",
    height: 220,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
  },
  // Wrapper for media placed outside the avatar-offset row so it goes edge-to-edge
  mediaSection: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    marginTop: 4,
    marginHorizontal: 45,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 36,
  },
  actionCount: { fontSize: 12 },
  activeIconWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  imgModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  imgModalImg: { width: "100%", height: "80%" },

  /* Repost Styles */
  repostHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  repostHeaderText: {
    fontSize: 12,
    fontFamily: typography.fontMedium,
  },
  repostCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 10,
  },
  repostCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  repostAvatarRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 1,
  },
  repostAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  repostAvatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  repostAvatarText: {
    fontSize: 8,
    fontFamily: typography.fontBold,
  },
  repostMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
    gap: 4,
  },
  repostAuthorName: {
    fontSize: 13,
    fontFamily: typography.fontBold,
  },
  repostAuthorHandle: {
    fontSize: 12,
    fontFamily: typography.fontRegular,
  },
  repostBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.fontRegular,
  },
  repostMedia: {
    width: "100%",
    height: 160,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  uniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 0.5,
    marginLeft: 4,
  },
  uniBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontSemiBold,
  },
});

/**
 * InlineVideoPlayer
 *
 * Self-sizing video player.  The container height is computed from the
 * video's natural aspect ratio once the player emits a videoTrackUpdate
 * event (expo-video >= 2.x / 3.x).  Until then a 16:9 skeleton is shown.
 */
function InlineVideoPlayer({
  sourceUrl,
  borderRadius = 0,
  borderColor,
}: {
  sourceUrl: string;
  borderRadius?: number;
  borderColor?: string;
}) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [aspectRatio, setAspectRatio] = React.useState<number | null>(null);

  if (!supportsVideoStories()) {
    return (
      <View
        style={{
          width: "100%",
          minHeight: 160,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.bg || "#1a1a24",
          borderRadius,
          borderWidth: borderColor ? 0.5 : 0,
          borderColor,
          gap: 6,
          padding: 12,
        }}
      >
        <Ionicons
          name="play-circle-outline"
          size={32}
          color={theme.textMuted || "#888"}
        />
        <Text
          style={{
            fontSize: 11,
            color: theme.textMuted || "#888",
            fontFamily: typography.fontMedium,
            textAlign: "center",
          }}
        >
          Video requires app update
        </Text>
      </View>
    );
  }

  const expoVideo = require("expo-video");

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const player = expoVideo.useVideoPlayer(sourceUrl, (p: any) => {
    p.loop = false;
  });

  // expo-video 3.x: listen for videoTrackUpdate to get natural size.
  // useEvent is the correct API — addListener does not exist on the player object.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const videoSize = expoVideo.useEvent
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      expoVideo.useEvent(player, "videoTrackUpdate", {
        videoTrack: player?.videoTrack ?? null,
      })?.videoTrack?.size
    : null;

  // Also try reading directly in case the track is already loaded (cache hit)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    const size = videoSize ?? player?.videoTrack?.size;
    if (size?.width > 0 && size?.height > 0) {
      setAspectRatio(size.height / size.width);
    }
  }, [videoSize, player?.videoTrack?.size]);

  const knownHeight =
    containerWidth > 0 && aspectRatio !== null
      ? containerWidth * aspectRatio
      : null;

  return (
    <View
      style={{
        width: "100%",
        height:
          knownHeight ??
          (containerWidth > 0 ? Math.round(containerWidth * (9 / 16)) : 220),
        backgroundColor: "black",
        borderRadius,
        borderWidth: borderColor ? 0.5 : 0,
        borderColor,
        overflow: "hidden",
      }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {knownHeight === null && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Ionicons
            name="play-circle-outline"
            size={36}
            color="rgba(255,255,255,0.25)"
          />
        </View>
      )}
      <expoVideo.VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={true}
        allowsFullscreen={true}
        showsTimecodes={true}
      />
    </View>
  );
}

/**
 * AspectRatioImage
 *
 * Wraps a remote image in a container whose height is derived from the
 * image's natural aspect ratio (via Image.getSize).  Same pattern as
 * InlineVideoPlayer so the visual behaviour is consistent.
 */
function AspectRatioImage({
  uri,
  borderRadius = 0,
  borderColor,
  onPress,
}: {
  uri: string;
  borderRadius?: number;
  borderColor?: string;
  onPress?: () => void;
}) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [aspectRatio, setAspectRatio] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0) setAspectRatio(h / w);
      },
      () => {
        /* failed to load — stay at default */
      },
    );
  }, [uri]);

  const knownHeight =
    containerWidth > 0 && aspectRatio !== null
      ? containerWidth * aspectRatio
      : null;

  const content = (
    <View
      style={{
        width: "100%",
        height:
          knownHeight ??
          (containerWidth > 0 ? Math.round(containerWidth * (9 / 16)) : 220),
        borderRadius,
        borderWidth: borderColor ? 0.5 : 0,
        borderColor,
        overflow: "hidden",
        backgroundColor: "#0d0d14",
        marginBottom: 10,
      }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}
