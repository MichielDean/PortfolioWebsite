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
  toggleTheme: () => { }
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.Dark);
  const colors = themeStyles[theme];

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--text', colors.text);
    root.style.setProperty('--secondary-text', colors.secondaryText);
    root.style.setProperty('--tertiary-text', colors.tertiaryText);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--container-bg', colors.containerBg);
    root.style.setProperty('--shadow', colors.shadow);
    root.style.setProperty('--shadow-hover', colors.shadowHover);
    root.style.setProperty('--border', colors.border);

    // Apply background color to body
    body.style.backgroundColor = colors.background;
    body.style.color = colors.text;

    // Create alpha variants for backgrounds
    root.style.setProperty('--accent-alpha-05', `${colors.accent}0d`);
    root.style.setProperty('--accent-alpha-10', `${colors.accent}1a`);
    root.style.setProperty('--accent-alpha-15', `${colors.accent}26`);
    root.style.setProperty('--accent-alpha-20', `${colors.accent}33`);
    root.style.setProperty('--accent-alpha-25', `${colors.accent}40`);
    root.style.setProperty('--accent-alpha-30', `${colors.accent}4d`);
    root.style.setProperty('--accent-alpha-35', `${colors.accent}59`);
    root.style.setProperty('--accent-alpha-40', `${colors.accent}66`);
    root.style.setProperty('--accent-alpha-50', `${colors.accent}80`);
    root.style.setProperty('--text-alpha-80', `${colors.text}cc`);
    root.style.setProperty('--container-bg-dd', `${colors.containerBg}dd`);
  }, [colors]);

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