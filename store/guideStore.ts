import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

interface GuideStep {
  key: string;
  route: string;
  title: string;
  message: string;
  targetY: number;
  targetHeight: number;
}

interface GuideState {
  isActive: boolean;
  currentStep: number;
  steps: GuideStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  initTour: (userCreatedAt: string | null | undefined) => Promise<void>;
}

const STORAGE_KEY = "@faf_guide_completed_v3";

export const useGuideStore = create<GuideState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  steps: [
    {
      key: "guide_dismissed_home",
      route: "/(tabs)",
      title: "Home Feed",
      message: "Explore posts, trending updates, and campus news from your friends and campus.",
      targetY: 105,
      targetHeight: 52,
    },
    {
      key: "guide_dismissed_discover",
      route: "/(tabs)/discover",
      title: "Student Directory",
      message: "Search, filter, and connect with other students on campus.",
      targetY: 105,
      targetHeight: 52,
    },
    {
      key: "guide_dismissed_events",
      route: "/(tabs)/events",
      title: "Campus Events",
      message: "Find, join, and register for student activities, clubs, and events.",
      targetY: 110,
      targetHeight: 52,
    },
    {
      key: "guide_dismissed_chat",
      route: "/(tabs)/chat",
      title: "Campus Chats",
      message: "Message your friends, study groups, and classmates in real-time.",
      targetY: 105,
      targetHeight: 65,
    },
    {
      key: "guide_dismissed_academic",
      route: "/academic",
      title: "Academic Hub",
      message: "Access course syllabus, past questions, notes, and study group listings.",
      targetY: 105,
      targetHeight: 90,
    },
  ],

  initTour: async (userCreatedAt) => {
    try {
      if (get().isActive) return;

      const completed = await AsyncStorage.getItem(STORAGE_KEY);
      if (completed === "true") return;

      let isNewUser = false;
      if (userCreatedAt) {
        const createdDate = new Date(userCreatedAt).getTime();
        const now = new Date().getTime();
        isNewUser = now - createdDate < 15 * 60 * 1000;
      }

      if (isNewUser) {
        set({ isActive: true, currentStep: 0 });
        router.replace("/(tabs)");
      }
    } catch (e) {
      console.error("Failed to init tour", e);
    }
  },

  startTour: () => {
    set({ isActive: true, currentStep: 0 });
    router.replace("/(tabs)");
  },

  nextStep: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) {
      const nextIdx = currentStep + 1;
      set({ currentStep: nextIdx });
      router.push(steps[nextIdx].route as any);
    } else {
      get().endTour();
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      set({ currentStep: prevIdx });
      router.push(get().steps[prevIdx].route as any);
    }
  },

  endTour: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      set({ isActive: false });
    } catch (e) {
      set({ isActive: false });
    }
  },
}));
