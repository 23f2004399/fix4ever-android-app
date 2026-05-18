import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  colorsLight,
  colorsDark,
  spacing,
  borderRadius,
  typography,
  type ColorPalette,
  type Theme,
} from './tokens';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = Theme & {
  isDark: boolean;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const isDark = themeMode === 'dark';

  const colorPalette = useMemo(() => {
    return themeMode === 'dark' ? colorsDark : colorsLight;
  }, [themeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: colorPalette,
      spacing,
      borderRadius,
      typography,
      isDark,
      colorPalette,
      themeMode,
      setThemeMode,
    }),
    [colorPalette, isDark, themeMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colors: colorsLight,
      spacing,
      borderRadius,
      typography,
      isDark: false,
      colorPalette: colorsLight,
      themeMode: 'light',
      setThemeMode: () => {},
    };
  }
  return ctx;
}
