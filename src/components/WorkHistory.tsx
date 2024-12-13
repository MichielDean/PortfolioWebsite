import * as React from 'react';
import { useTheme } from "../context/ThemeContext";
import { useWindowSize } from '../hooks/useWindowSize';
import ThemeToggle from './ThemeToggle';
import Accordion from './Accordion';
import { headingStyles } from '../styles/pageStyles';
import { profileData } from "../data/profileData";

const WorkHistory: React.FC = () => {
  const { colors } = useTheme();
  const { isMobile } = useWindowSize();

  return (
    <div style={{ 
      width: '100%',
      padding: isMobile ? '1rem' : '1.5rem',
      backgroundColor: colors.background === '#ffffff' ? '#f8fafc' : colors.containerBg,
      borderRadius: '8px',
      boxShadow: colors.background === '#ffffff' 
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
        : colors.shadow,
      border: colors.background === '#ffffff' ? '1px solid #e2e8f0' : 'none'
    }}>
      <ThemeToggle />
      <h2 style={{
        ...headingStyles,
        fontSize: isMobile ? "1.8rem" : "2rem",
        borderBottom: `2px solid ${colors.accent}`,
        paddingBottom: "0.5rem",
        marginBottom: "2rem"
      }}>Work Experience</h2>
      <Accordion workHistory={profileData.workHistory} />
    </div>
  );
};

export default WorkHistory;
