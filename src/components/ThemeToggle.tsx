import * as React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types/themeTypes';
import * as styles from './ThemeToggle.module.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={styles.button}
      aria-label={`Switch to ${theme === ThemeMode.Dark ? 'light' : 'dark'} mode`}
    >
      <span className={styles.icon}>
        {theme === ThemeMode.Dark ? '☀️' : '🌙'}
      </span>
      <span>{theme === ThemeMode.Dark ? 'Light' : 'Dark'}</span>
    </button>
  );
};

export default ThemeToggle;
