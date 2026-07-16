/** Quick-access color tokens for non-themed components */
export const COLORS = {
  primary: "#FF6B00",
  primaryLight: "#FF8C33",
  navy: "#0D1B2A",
  navyMid: "#1A2D42",
  border: "#E2E8F0",
  error: "#E53E3E",
  success: "#38A169",
  textMuted: "#9AA5B1",
};

const primary = "#FF6B00";
const primaryLight = "#FF8C33";
const primaryDark = "#CC5500";
const navy = "#0D1B2A";
const navyMid = "#1A2D42";
const navyLight = "#2A3F57";

export function tintedShadow(
  bgColor: string,
  opacity: number = 0.12,
  radius: number = 8
) {
  return {
    shadowColor: bgColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: radius / 2,
  };
}

export const Colors = {
  light: {
    primary,
    primaryLight,
    primaryDark,
    background: "#FFF8F0",
    surface: "#FFFFFF",
    surfaceSecondary: "#FFF0E0",
    text: navy,
    textSecondary: "#4A5568",
    textMuted: "#9AA5B1",
    border: "#F0E4D8",
    tint: primary,
    tabIconDefault: "#9AA5B1",
    tabIconSelected: primary,
    error: "#E53E3E",
    success: "#38A169",
    skeleton: "#F5EDE6",
    skeletonHighlight: "#FFF5EC",
    terracotta: "#D4764A",
    cream: "#FFF8F0",
    amber: "#F59E0B",
    sage: "#84A98C",
  },
  dark: {
    primary,
    primaryLight,
    primaryDark,
    background: "#0A0F18",
    surface: "#151D28",
    surfaceSecondary: "#1C2532",
    text: "#F0F4F8",
    textSecondary: "#A0AEC0",
    textMuted: "#4A5568",
    border: "#1E2A3A",
    tint: primary,
    tabIconDefault: "#4A5568",
    tabIconSelected: primary,
    error: "#FC8181",
    success: "#68D391",
    skeleton: "#1C2532",
    skeletonHighlight: "#243042",
    terracotta: "#B8653F",
    cream: "#1C1510",
    amber: "#D97706",
    sage: "#6B8F73",
  },
};

export default Colors;
