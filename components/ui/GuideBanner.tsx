import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../lib/theme";
import { typography } from "../../lib/typography";

interface GuideBannerProps {
  storageKey: string;
  title: string;
  message: string;
  topOffset?: number;
}

export default function GuideBanner({
  storageKey,
  title,
  message,
  topOffset,
}: GuideBannerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkDismissed();
  }, [storageKey]);

  const checkDismissed = async () => {
    try {
      const value = await AsyncStorage.getItem(storageKey);
      if (value !== "true") {
        setVisible(true);
      }
    } catch (e) {
      setVisible(true);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(storageKey, "true");
      setVisible(false);
    } catch (e) {
      setVisible(false);
    }
  };

  return null; // Temporarily disabled globally

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.dark
            ? "rgba(167, 139, 250, 0.4)"
            : "rgba(167, 139, 250, 0.6)",
          top: topOffset !== undefined ? topOffset : 12,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={theme.accent}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>
          {message}
        </Text>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
        <Ionicons name="close" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  iconContainer: {
    paddingTop: 1,
  },
  content: {
    flex: 1,
    paddingRight: 20,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontFamily: typography.fontBold,
  },
  message: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: typography.fontRegular,
  },
  closeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
  },
});

