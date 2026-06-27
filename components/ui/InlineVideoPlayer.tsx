import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "../../lib/theme";
import { typography } from "../../lib/typography";
import { supportsVideoStories } from "../../lib/featureFlags";

interface InlineVideoPlayerProps {
  sourceUrl: string;
  style?: any;
  borderRadius?: number;
  borderColor?: string;
  paused?: boolean;
}

export default function InlineVideoPlayer({
  sourceUrl,
  style,
  borderRadius = 0,
  borderColor,
  paused = false,
}: InlineVideoPlayerProps) {
  const theme = useTheme();
  const videoRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const isFocused = useIsFocused();

  if (!supportsVideoStories()) {
    return (
      <View
        style={[
          style,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.bg || "#1a1a24",
            borderRadius,
            borderWidth: borderColor ? 0.5 : 0,
            borderColor,
            gap: 6,
            padding: 12,
          },
        ]}
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
    p.autoplay = false; // Prevent auto-playing silently in background
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const videoSize = expoVideo.useEvent
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      expoVideo.useEvent(player, "videoTrackUpdate", {
        videoTrack: player?.videoTrack ?? null,
      })?.videoTrack?.size
    : null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const size = videoSize ?? player?.videoTrack?.size;
    if (size?.width > 0 && size?.height > 0) {
      setAspectRatio(size.height / size.width);
    }
  }, [videoSize, player?.videoTrack?.size]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!player) return;
    if (paused || !isFocused) {
      player.pause();
    }
  }, [paused, isFocused, player]);

  // Sync state variables
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [currentTime, setCurrentTime] = useState(0);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [duration, setDuration] = useState(0);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isMuted, setIsMuted] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showControls, setShowControls] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [progressBarWidth, setProgressBarWidth] = useState(1);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [videoLoading, setVideoLoading] = useState(player?.status === "loading" || player?.buffering);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!player) return;

    player.timeUpdateEventInterval = 0.25;
    setIsPlaying(player.playing);
    setDuration(player.duration);
    setIsMuted(player.muted);

    const playingSub = player.addListener("playingChange", (event: any) => {
      setIsPlaying(event.isPlaying);
    });

    const timeSub = player.addListener("timeUpdate", (event: any) => {
      setCurrentTime(event.currentTime);
      if (player.duration > 0) {
        setDuration(player.duration);
      }
    });

    const statusSub = player.addListener("statusChange", (event: any) => {
      setVideoLoading(event.status === "loading" || player.buffering);
      if (event.status === "readyToPlay") {
        setDuration(player.duration);
      }
    });

    const bufferingSub = player.addListener("bufferingChange", (event: any) => {
      setVideoLoading(player.status === "loading" || event.isBuffering);
    });

    const volumeSub = player.addListener("volumeChange", (event: any) => {
      setIsMuted(player.muted);
    });

    return () => {
      playingSub.remove();
      timeSub.remove();
      statusSub.remove();
      bufferingSub.remove();
      volumeSub.remove();
    };
  }, [player]);

  // Auto-hide controls timer
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let timeout: any;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls, isPlaying]);

  const handleProgressBarPress = (e: any) => {
    const x = e.nativeEvent.locationX;
    const pct = Math.max(0, Math.min(1, x / progressBarWidth));
    const seekTime = pct * duration;
    player.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === null || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  const progressPct = duration > 0 ? currentTime / duration : 0;
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const hasHeightInStyle = flattenedStyle.height !== undefined;

  const knownHeight =
    containerWidth > 0 && aspectRatio !== null
      ? containerWidth * aspectRatio
      : null;

  const computedHeight = hasHeightInStyle
    ? flattenedStyle.height
    : knownHeight ??
      (containerWidth > 0 ? Math.round(containerWidth * (9 / 16)) : 220);

  return (
    <View
      style={[
        style,
        {
          width: flattenedStyle.width || "100%",
          height: computedHeight,
          maxHeight: 360,
          backgroundColor: "black",
          borderRadius,
          borderWidth: borderColor ? 0.5 : 0,
          borderColor,
          overflow: "hidden",
          position: "relative",
        },
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <expoVideo.VideoView
        ref={videoRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={true}
        showsTimecodes={false}
      />

      {/* Main interaction overlay to toggle controls */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => setShowControls((prev) => !prev)}
      />

      {/* Play/Pause circular button in the center (Always visible except when loading) */}
      {!videoLoading && (
        <TouchableOpacity
          style={styles.playPauseBtn}
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Buffering/Loading Indicator */}
      {videoLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}

      {/* Other controls (visible only on tap/interaction) */}
      {showControls && (
        <View style={styles.controlsContainer}>
          {/* Progress bar track */}
          <TouchableOpacity
            style={styles.progressBarTrack}
            onPress={handleProgressBarPress}
            onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
            activeOpacity={1}
          >
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPct * 100}%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Bottom row actions */}
          <View style={styles.bottomRow}>
            <Text style={styles.timeText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>

            <View style={styles.actionsRight}>
              <TouchableOpacity
                onPress={() => {
                  player.muted = !isMuted;
                  setIsMuted(!isMuted);
                }}
                style={styles.iconButton}
              >
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-high"}
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  videoRef.current?.enterFullscreen();
                }}
                style={styles.iconButton}
              >
                <Ionicons name="expand" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  playPauseBtn: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingOverlay: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 5,
  },
  progressBarTrack: {
    height: 12,
    justifyContent: "center",
    marginBottom: 6,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: typography.fontMedium,
  },
  actionsRight: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  iconButton: {
    padding: 2,
  },
});
