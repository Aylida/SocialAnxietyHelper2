import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY_DARK = 'isDarkTheme'; // Java tarafındaki ThemeManager ile aynı anahtar

export type ThemeColors = {
  appBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  navBg: string;
};

const LIGHT: ThemeColors = {
  appBg: '#F5F5F0',
  cardBg: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#8A8A8A',
  border: '#EEEEEE',
  navBg: '#FFFFFF',
};

const DARK: ThemeColors = {
  appBg: '#17140F',
  cardBg: '#242018',
  textPrimary: '#F5F0E8',
  textSecondary: '#B0A898',
  border: '#332C20',
  navBg: '#1E1B15',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(PREFS_KEY_DARK);
      setIsDark(stored === 'true');
      setLoaded(true);
    })();
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark);
    AsyncStorage.setItem(PREFS_KEY_DARK, dark ? 'true' : 'false');
  }, []);

  const toggleTheme = useCallback(() => {
    setDark(!isDark);
  }, [isDark, setDark]);

  // İlk yükleme bitene kadar açık temayı göster (flaş/titreme olmasın diye)
  if (!loaded) {
    return (
      <ThemeContext.Provider value={{ isDark: false, colors: LIGHT, toggleTheme, setDark }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK : LIGHT, toggleTheme, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı');
  return ctx;
}
