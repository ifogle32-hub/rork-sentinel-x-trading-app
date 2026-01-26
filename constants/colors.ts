export default {
  background: "#000000",
  surface: "#0B0B0F",
  surfaceElevated: "#13131A",

  primary: "#B1001A",
  primaryDark: "#7A0012",
  primaryLight: "#E51C33",

  text: "#F2F2F6",
  textSecondary: "#A2A2AE",
  textMuted: "#676774",

  success: "#A2A2AE",
  warning: "#E51C33",
  error: "#E51C33",

  border: "#1B1B22",
  borderActive: "#B1001A",

  gray: {
    900: "#000000",
    800: "#0B0B0F",
    700: "#13131A",
    600: "#1B1B22",
    500: "#676774",
    400: "#848493",
    300: "#A2A2AE",
  },

  glass: {
    background: "rgba(13, 13, 18, 0.75)",
    surface: "rgba(22, 22, 29, 0.65)",
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.12)",
    highlight: "rgba(255, 255, 255, 0.05)",
    shadow: "rgba(0, 0, 0, 0.4)",
  },

  glassDarker: {
    background: "rgba(5, 5, 8, 0.92)",
    surface: "rgba(10, 10, 14, 0.88)",
    border: "rgba(255, 255, 255, 0.04)",
    borderLight: "rgba(255, 255, 255, 0.06)",
    highlight: "rgba(255, 255, 255, 0.02)",
    shadow: "rgba(0, 0, 0, 0.6)",
  },

  textAdaptive: {
    primary: "rgba(240, 240, 245, 1)",
    primaryDarker: "rgba(220, 220, 228, 1)",
    secondary: "rgba(152, 152, 168, 1)",
    secondaryDarker: "rgba(130, 130, 148, 1)",
    muted: "rgba(90, 90, 110, 1)",
    mutedDarker: "rgba(75, 75, 95, 1)",
  },

  gradient: {
    primary: ["#FF4757", "#FF6B7A"] as const,
    dark: ["#0D0D12", "#050508"] as const,
    glass: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)", "rgba(0,0,0,0.02)"] as const,
  },
};
