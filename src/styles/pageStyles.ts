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
    padding: window.innerWidth <= 768 ? "1rem" : "1.5rem", // Explicit horizontal and vertical padding
    backgroundColor: colors.containerBg,
    transition: "all 0.2s ease",
    // Additional styles for light mode
    ...(colors.background === '#ffffff' && {
      backgroundColor: '#f8fafc',
    })
  },
  expandedContent: {
    padding: '0.5rem 1.5rem 1.5rem', // Reduce top padding, maintain sides and bottom
    backgroundColor: colors.containerBg,
    transition: 'all 0.3s ease',
    maxHeight: '0',
    opacity: 0,
    overflow: 'hidden',
    ...(colors.background === '#ffffff' && {
      backgroundColor: '#f7fafc',
    })
  },
  previewContent: {
    position: 'relative',
    maxHeight: '150px',
    overflow: 'hidden',
    backgroundColor: colors.containerBg,
    ...(colors.background === '#ffffff' && {
      backgroundColor: '#f7fafc',
    })
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100px',
    background: `linear-gradient(
      to bottom,
      transparent,
      ${colors.background === '#ffffff' ? '#f7fafc' : colors.containerBg}
    )`,
    pointerEvents: 'none',
  },
  role: {
    fontSize: window.innerWidth <= 768 ? "1.2rem" : "1.4rem",
    color: colors.text,
    marginBottom: "0.5rem",
    fontWeight: 600,
  },
  company: {
    color: colors.secondaryText,
    fontSize: "1.1rem",
    marginBottom: "0.5rem",
  },
  duration: {
    color: colors.tertiaryText,
    fontSize: "0.9rem",
    fontStyle: "italic",
    marginBottom: "1rem",
  },
  description: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  descriptionItem: {
    color: colors.secondaryText,
    fontSize: "1rem",
    lineHeight: "1.6",
    marginBottom: "0.5rem",
    paddingLeft: window.innerWidth <= 768 ? '0.8rem' : '1.2rem',
    position: "relative",
    listStyleType: 'disc',
    listStylePosition: 'inside',
  },
  subDescriptionItem: {
    color: colors.secondaryText,
    fontSize: "0.9rem",
    lineHeight: "1.4",
    marginBottom: "0.5rem",
    paddingLeft: window.innerWidth <= 768 ? '1.6rem' : '2.4rem',
    position: "relative",
    listStyleType: 'circle',
    listStylePosition: 'inside',
  }
});
