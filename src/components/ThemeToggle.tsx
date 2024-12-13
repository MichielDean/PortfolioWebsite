import * as React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useWindowSize } from '../hooks/useWindowSize';
import { ThemeMode } from '../types/themeTypes';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, colors } = useTheme();
  const { isMobile } = useWindowSize();

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'absolute',
        top: isMobile ? '0.5rem' : '1rem',
        right: isMobile ? '0.5rem' : '1rem',
        padding: isMobile ? '0.3rem 0.8rem' : '0.5rem 1rem',
        borderRadius: '20px',
        backgroundColor: colors.accent,
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontSize: isMobile ? '0.8rem' : '1rem',
      }}
    >
      {theme === ThemeMode.Dark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
};

export default ThemeToggle;
