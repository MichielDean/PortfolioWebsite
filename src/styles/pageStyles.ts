import { Theme, ThemeColors, ThemeMode } from '../types/themeTypes';

export const pageStyles = {
  color: "#232129",
  padding: 96,
  fontFamily: "-apple-system, Roboto, sans-serif, serif",
};

export const headingStyles = {
  marginTop: 0,
  marginBottom: 64,
  maxWidth: 320,
};

export const theme: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#ffffff',
    text: '#2d3748',
    secondaryText: '#4a5568',
    tertiaryText: '#718096',
    accent: '#63b3ed',
    containerBg: '#ffffff',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    shadowHover: '0 4px 8px rgba(0, 0, 0, 0.1)',
    border: '#e2e8f0'
  },
  dark: {
    background: '#1a202c',
    text: '#f7fafc',
    secondaryText: '#e2e8f0',
    tertiaryText: '#cbd5e0',
    accent: '#4299e1',
    containerBg: '#2d3748',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    shadowHover: '0 4px 8px rgba(0, 0, 0, 0.3)',
    border: '#4a5568'
  }
};

// Add the work experience styles here
export const getWorkExperienceStyles = (colors: Theme) => ({
  workContainer: {
    backgroundColor: colors.containerBg,
    transition: "all 0.2s ease",
  },
  role: {
    color: colors.text,
    fontSize: '1.2rem',
    marginBottom: '0.5rem'
  },
  duration: {
    color: colors.secondaryText,
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  description: {
    listStyleType: 'disc',
    paddingLeft: '1.2rem',
    margin: '1rem 0'
  },
  descriptionItem: {
    color: colors.text,
    marginBottom: '0.5rem',
    lineHeight: '1.5'
  },
  subDescriptionItem: {
    color: colors.secondaryText,
    fontSize: '0.9rem',
    marginTop: '0.3rem',
    lineHeight: '1.4'
  },
  expandedContent: {
    transition: 'all 0.3s ease-in-out',
    overflow: 'hidden'
  },
  previewContent: {
    transition: 'all 0.3s ease-in-out',
    overflow: 'hidden',
    position: 'relative'
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50px',
    background: `linear-gradient(to bottom, transparent, ${colors.containerBg})`,
    pointerEvents: 'none'
  }
});

export const getMainContainerStyles = (colors: Theme, isMobile: boolean) => ({
  ...pageStyles,
  backgroundColor: colors.background,
  color: colors.text,
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2rem',
  padding: isMobile ? '1rem' : pageStyles.padding,
});
