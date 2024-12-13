import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types/themeTypes';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme} 
      style={{
        position: 'absolute',
        top: window.innerWidth <= 768 ? '0.5rem' : '1rem',
        right: window.innerWidth <= 768 ? '0.5rem' : '1rem',
        padding: window.innerWidth <= 768 ? '0.3rem 0.8rem' : '0.5rem 1rem',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: theme === ThemeMode.Light ? '#63b3ed' : '#2d3748',
        color: '#fff',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease'
      }}
    >
      {theme === ThemeMode.Light ? '🌞 Light Mode' : '🌜 Dark Mode'}
    </button>
  );
};

export default ThemeToggle;
