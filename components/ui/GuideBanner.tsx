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
}

export default function GuideBanner({ storageKey, title, message }: GuideBannerProps) {
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

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.dark ? "rgba(167, 139, 250, 0.4)" : "rgba(167, 139, 250, 0.6)",
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
        <TouchableOpacity
          style={[styles.dismissBtn, { backgroundColor: theme.accent }]}
          onPress={handleDismiss}
        >
          <Text style={styles.dismissText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 9999,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    paddingTop: 1,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: typography.fontBold,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.fontRegular,
    marginBottom: 6,
  },
  dismissBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dismissText: {
    color: "#0f0b25",
    fontSize: 11,
    fontFamily: typography.fontBold,
  },
});
