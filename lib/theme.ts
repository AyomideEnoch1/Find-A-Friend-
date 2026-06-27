import * as React from "react";
import { createContext, useContext } from "react";
import { useThemeStore } from "../store/themeStore";

export const glowShadow = {
  shadowColor: "#a78bfa",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 8,
} as const;

// Light mode
export const LIGHT = {
  bg: "#f8fafc",
  card: "rgba(255,255,255,0.9)",
  cardSolid: "#ffffff",
  card2: "#f1f5f9",

  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",

  border: "#cbd5e1",
  border2: "#e2e8f0",
  borderAccent: "rgba(139,92,246,0.3)",

  accent: "#8b5cf6",
  accentSecondary: "#6366f1",

  accentBg: "#f5f3ff",
  accentBorder: "#ddd6fe",
  accentGlow: "rgba(139,92,246,0.15)",

  cyan: "#06b6d4",
  danger: "#ef4444",
  success: "#10b981",

  statusBar: "dark" as const,
  dark: false,
  cardShadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Dark mode — the standard deep dark theme
export const DARK = {
  bg: "#0a0a1a",
  card: "rgba(255,255,255,0.055)",
  cardSolid: "#0f0f2a",
  card2: "#24243a",
  text: "#f0f0ff",
  textMuted: "rgba(240, 240, 255, 0.68)",
  textFaint: "rgba(240, 240, 255, 0.45)",
  border: "rgba(255,255,255,0.13)",
  border2: "rgba(255,255,255,0.07)",
  borderAccent: "rgba(167,139,250,0.3)",
  accent: "#a78bfa",
  accentSecondary: "#6366f1",
  accentBg: "rgba(167,139,250,0.15)",
  accentBorder: "rgba(167,139,250,0.35)",
  accentGlow: "rgba(167,139,250,0.25)",
  cyan: "#22d3ee",
  danger: "#ef4444",
  success: "#34d399",
  statusBar: "light" as const,
  dark: true,
  cardShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
};

// Darker mode — near-black "amoled" variant
export const DARKER = {
  bg: "#050508",
  card: "rgba(255,255,255,0.045)",
  cardSolid: "#08080f",
  card2: "#14141e",
  text: "#f0f0ff",
  textMuted: "rgba(240, 240, 255, 0.68)",
  textFaint: "rgba(240, 240, 255, 0.4)",
  border: "rgba(255,255,255,0.1)",
  border2: "rgba(255,255,255,0.05)",
  borderAccent: "rgba(167,139,250,0.25)",
  accent: "#a78bfa",
  accentSecondary: "#6366f1",
  accentBg: "rgba(167,139,250,0.12)",
  accentBorder: "rgba(167,139,250,0.35)",
  accentGlow: "rgba(167,139,250,0.25)",
  cyan: "#22d3ee",
  danger: "#ef4444",
  success: "#34d399",
  statusBar: "light" as const,
  dark: true,
  cardShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Premium cosmic/galactic dark mode theme specifically for the Global Hub
export const COSMIC_THEME = {
  bg: "#06060f", // Deep space black
  card: "rgba(25, 10, 55, 0.45)", // Deep violet/dark glassmorphic card
  cardSolid: "#0f0b25",
  card2: "#191238",
  text: "#f5f3ff", // Near white violet
  textMuted: "rgba(207, 198, 245, 0.7)",
  textFaint: "rgba(207, 198, 245, 0.3)",
  border: "rgba(167, 139, 250, 0.25)",
  border2: "rgba(167, 139, 250, 0.12)",
  borderAccent: "rgba(167, 139, 250, 0.45)",
  accent: "#c084fc", // Radiant violet/neon purple
  accentSecondary: "#818cf8", // Neon indigo/blue
  accentBg: "rgba(167, 139, 250, 0.15)",
  accentBorder: "rgba(167, 139, 250, 0.35)",
  accentGlow: "rgba(192, 132, 252, 0.35)",
  cyan: "#22d3ee",
  danger: "#ef4444",
  success: "#34d399",
  statusBar: "light" as const,
  dark: true,
  cardShadow: {
    shadowColor: "#c084fc",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};

// Premium cosmic/galactic light mode theme specifically for the Global Hub
export const COSMIC_LIGHT = {
  bg: "#f3f0ff", // Soft pastel lavender background
  card: "rgba(255, 255, 255, 0.75)", // Translucent white card
  cardSolid: "#ffffff",
  card2: "#eae5f9",
  text: "#2e1065", // Deep space dark purple text
  textMuted: "rgba(46, 16, 101, 0.65)",
  textFaint: "rgba(46, 16, 101, 0.3)",
  border: "rgba(167, 139, 250, 0.3)",
  border2: "rgba(167, 139, 250, 0.15)",
  borderAccent: "rgba(124, 58, 237, 0.45)",
  accent: "#7c3aed", // Rich purple/violet
  accentSecondary: "#4f46e5", // Indigo
  accentBg: "rgba(167, 139, 250, 0.1)",
  accentBorder: "rgba(167, 139, 250, 0.25)",
  accentGlow: "rgba(124, 58, 237, 0.15)",
  cyan: "#0891b2",
  danger: "#ef4444",
  success: "#10b981",
  statusBar: "dark" as const,
  dark: false,
  cardShadow: {
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};

export type ThemeColors = {
  bg: string;
  card: string;
  cardSolid: string;
  card2: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  border2: string;
  borderAccent: string;
  accent: string;
  accentSecondary: string;
  accentBg: string;
  accentBorder: string;
  accentGlow: string;
  cyan: string;
  danger: string;
  success: string;
  statusBar: "light" | "dark";
  dark: boolean;
  cardShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

const ThemeContext = createContext<ThemeColors>(LIGHT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeStore();
  const theme = mode === 'light' ? LIGHT : (mode === 'darker' ? DARKER : DARK);
  return React.createElement(
    ThemeContext.Provider,
    { value: theme },
    children,
  );
}

export function adjustColorForContrast(
  hexColor: string | null | undefined,
  isDarkTheme: boolean,
  defaultAccent = "#a78bfa"
): string {
  if (!hexColor || !hexColor.startsWith("#")) return defaultAccent;

  const cleanHex = hexColor.slice(0, 7);
  if (cleanHex.length < 7) return defaultAccent;

  const r = parseInt(cleanHex.slice(1, 3), 16);
  const g = parseInt(cleanHex.slice(3, 5), 16);
  const b = parseInt(cleanHex.slice(5, 7), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return defaultAccent;

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (isDarkTheme) {
    if (brightness < 125) {
      const newR = Math.round(r + (255 - r) * 0.6);
      const newG = Math.round(g + (255 - g) * 0.6);
      const newB = Math.round(b + (255 - b) * 0.6);
      return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
    }
  } else {
    if (brightness > 195) {
      const newR = Math.round(r * 0.55);
      const newG = Math.round(g * 0.55);
      const newB = Math.round(b * 0.55);
      return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
    }
  }

  return cleanHex;
}

export function useTheme(): ThemeColors {
  const theme = useContext(ThemeContext);
  const { activeUniversity, feedMode, mode } = useThemeStore();

  if (feedMode === 'global') {
    return mode === 'light' ? COSMIC_LIGHT : COSMIC_THEME;
  }

  if (activeUniversity) {
    const isDark = theme.dark;
    const resolvedAccent = adjustColorForContrast(activeUniversity.primary_color, isDark, theme.accent);
    const resolvedSecondary = adjustColorForContrast(activeUniversity.secondary_color, isDark, theme.accentSecondary);
    return {
      ...theme,
      accent: resolvedAccent,
      accentSecondary: resolvedSecondary,
      accentBg: `${resolvedAccent}1a`, // Translucent background
      accentBorder: `${resolvedAccent}4d`,
      accentGlow: `${resolvedAccent}2b`,
    };
  }

  return theme;
}
