import React from "react";
import Svg, { Circle, Ellipse, Line } from "react-native-svg";

interface AppLogoProps {
  size: number;
  color: string;
  strokeWidth?: number;
}

// Same mark as assets/images/icon.png and splash-icon.png (circle +
// meridian ellipse + equator line) so the in-app logo and the native
// app icon/splash are the same design, not just similar.
export function AppLogo({ size, color, strokeWidth = 10 }: AppLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Circle cx="100" cy="100" r="72" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Ellipse cx="100" cy="100" rx="34" ry="72" fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="30" y1="100" x2="170" y2="100" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
