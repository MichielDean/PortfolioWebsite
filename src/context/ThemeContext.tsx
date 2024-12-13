import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode, ThemeColors } from '../types/themeTypes';
import { theme as themeStyles } from '../styles/pageStyles';

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

// Provide a default value for the context
const defaultThemeContext: ThemeContextType = {
  theme: ThemeMode.Dark,
  colors: themeStyles[ThemeMode.Dark],
  toggleTheme: () => {}
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.Dark);
  const colors = themeStyles[theme];

  const toggleTheme = () => {
    setTheme(curr => (curr === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light));
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export { ThemeProvider, useTheme };