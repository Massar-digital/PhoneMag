import React, { createContext, useContext, useState, useEffect } from 'react';

// export type Theme = 'light' | 'dark' | 'system';

// interface ThemeContextType {
//   theme;
//   actualTheme; // The resolved theme (system resolves to light/dark)
//   setTheme: (theme) => void;
//   toggleTheme: () => void;
// }

const ThemeContext = createContext(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// interface ThemeProviderProps {
//   children: ReactNode;
//   defaultTheme;
// }

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('light');
  const [actualTheme, setActualTheme] = useState('light');

  const applyTheme = () => {
    const root = document.documentElement;
    root.classList.remove('dark');
  };

  const setTheme = () => {};
  const toggleTheme = () => {};

  useEffect(() => {
    applyTheme();
  }, []);

  const value = {
    theme: 'light',
    actualTheme: 'light',
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
