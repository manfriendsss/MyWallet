import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// The page background of each theme (--color-paper in tokens.css), as hex for the browser chrome
const STATUS_BAR = { light: '#f7f4f0', dark: '#211c17' };

/**
 * The phone's status bar (and an installed app's title bar) follows the app's own theme,
 * not the OS setting, so it always matches what is on screen.
 */
function syncStatusBar(isDark: boolean) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = isDark ? STATUS_BAR.dark : STATUS_BAR.light;
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

  // Browser theme-color cannot change Android's icon contrast inside the APK.
  // Light is dark text; Dark is light text in Capacitor's StatusBar API.
  if (Capacitor.isNativePlatform()) {
    void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    void StatusBar.setBackgroundColor({ color: isDark ? STATUS_BAR.dark : STATUS_BAR.light });
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('mywallet_theme');
    return (saved as ThemeMode) || 'dark';
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeIsDark = true;
      if (theme === 'system') {
        activeIsDark = mediaQuery.matches;
      } else {
        activeIsDark = theme === 'dark';
      }

      setIsDark(activeIsDark);
      if (activeIsDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      syncStatusBar(activeIsDark);
    };

    applyTheme();
    localStorage.setItem('mywallet_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
