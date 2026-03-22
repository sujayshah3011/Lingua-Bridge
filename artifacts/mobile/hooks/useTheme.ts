import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants/colors";

export function useTheme() {
  const { isDark } = useApp();
  const theme = useMemo(
    () => (isDark ? Colors.dark : Colors.light),
    [isDark]
  );
  return { theme, isDark };
}
