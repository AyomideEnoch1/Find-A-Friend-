import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "../../lib/theme";
import { typography } from "../../lib/typography";
import { useGuideStore } from "../../store/guideStore";
import { useAuthStore } from "../../store/authStore";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
  const { user } = useAuthStore();
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    endTour,
    initTour,
  } = useGuideStore();

  useEffect(() => {
    if (user?.created_at) {
      initTour(user.created_at);
    }
  }, [user]);

  // If the tour is not active, do not render anything
  if (!isActive) return null;

  const activeStep = steps[currentStep];
  // Only render this banner instance if its storageKey matches the active step's key
  if (activeStep.key !== storageKey) return null;

  const targetX = 16;
  const targetWidth = screenWidth - 32;
  const targetY = activeStep.targetY;
  const targetHeight = activeStep.targetHeight;

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 1. Top Blur Overlay */}
      <BlurView
        intensity={20}
        tint="dark"
        style={[
          styles.blurOverlay,
          {
            left: 0,
            top: 0,
            width: screenWidth,
            height: targetY,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
          },
        ]}
      />
      {/* 2. Bottom Blur Overlay */}
      <BlurView
        intensity={20}
        tint="dark"
        style={[
          styles.blurOverlay,
          {
            left: 0,
            top: targetY + targetHeight,
            width: screenWidth,
            height: screenHeight - (targetY + targetHeight),
            backgroundColor: "rgba(0, 0, 0, 0.65)",
          },
        ]}
      />
      {/* 3. Left Blur Overlay */}
      <BlurView
        intensity={20}
        tint="dark"
        style={[
          styles.blurOverlay,
          {
            left: 0,
            top: targetY,
            width: targetX,
            height: targetHeight,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
          },
        ]}
      />
      {/* 4. Right Blur Overlay */}
      <BlurView
        intensity={20}
        tint="dark"
        style={[
          styles.blurOverlay,
          {
            left: targetX + targetWidth,
            top: targetY,
            width: screenWidth - (targetX + targetWidth),
            height: targetHeight,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
          },
        ]}
      />

      {/* Onboarding Guide Card */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: theme.dark ? "rgba(167, 139, 250, 0.3)" : "rgba(124, 58, 237, 0.2)",
            top: targetY + targetHeight + 16,
          },
        ]}
      >
        {/* Close Button X */}
        <TouchableOpacity style={styles.closeBtn} onPress={endTour} hitSlop={12}>
          <Ionicons name="close" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Info header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: theme.dark ? "rgba(167,139,250,0.12)" : "rgba(124,58,237,0.08)" }]}>
            <Ionicons
              name="bulb"
              size={18}
              color={theme.accent}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: theme.text }]}>{activeStep.title}</Text>
            <Text style={[styles.stepText, { color: theme.textMuted }]}>
              Step {currentStep + 1} of {steps.length}
            </Text>
          </View>
        </View>

        {/* Description message */}
        <Text style={[styles.message, { color: theme.textMuted }]}>
          {activeStep.message}
        </Text>

        {/* Navigation actions footer */}
        <View style={styles.footer}>
          {/* Back button */}
          {!isFirst ? (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.backBtn,
                { borderColor: theme.border },
              ]}
              onPress={prevStep}
            >
              <Ionicons name="arrow-back" size={14} color={theme.text} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 68 }} />
          )}

          {/* Dots indicator */}
          <View style={styles.dotsContainer}>
            {steps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === currentStep
                        ? theme.accent
                        : theme.dark
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(0, 0, 0, 0.1)",
                  },
                ]}
              />
            ))}
          </View>

          {/* Next / Finish Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.nextBtn,
              { backgroundColor: theme.accent },
            ]}
            onPress={nextStep}
          >
            <Text style={[styles.actionBtnText, styles.nextBtnText]}>
              {isLast ? "Finish" : "Next"}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={14} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    position: "absolute",
    zIndex: 9999,
  },
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10000,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10001,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: typography.fontBold,
  },
  stepText: {
    fontSize: 10,
    fontFamily: typography.fontMedium,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.fontRegular,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 70,
  },
  backBtn: {
    borderWidth: 1,
  },
  nextBtn: {},
  actionBtnText: {
    fontSize: 12,
    fontFamily: typography.fontSemiBold,
  },
  nextBtnText: {
    color: "#fff",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
