import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// --color-surface in tokens.css as hex: the header and bottom bar share it, and Chrome on
// Android paints both the status bar and the system navigation bar with theme-color.
// Keep in sync with public/theme-init.js.
const STATUS_BAR = { light: '#f8f5f1', dark: '#2d2621' };

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

  // Android/Chrome PWA uses these hints to choose icon contrast in browser
  // chrome. On light UI this explicitly requests dark status-bar text/icons.
  let colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta');
    colorSchemeMeta.name = 'color-scheme';
    document.head.appendChild(colorSchemeMeta);
  }
  colorSchemeMeta.content = isDark ? 'dark' : 'light';

  // Safari uses a separate PWA status-bar hint. It is applied on the next
  // launch on platforms that do not update it during an active session.
  const appleStatusBar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleStatusBar) appleStatusBar.content = isDark ? 'black-translucent' : 'default';
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
