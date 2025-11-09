import { ThemeColors, ThemeMode } from '../types/themeTypes';

export const theme: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#F8FAFC',
    text: '#111827',
    secondaryText: '#374151',
    tertiaryText: '#6B7280',
    accent: '#2563EB',
    containerBg: '#FFFFFF',
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    shadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '#E5E7EB'
  },
  dark: {
    background: '#0F172A',
    text: '#F8FAFC',
    secondaryText: '#E2E8F0',
    tertiaryText: '#CBD5E0',
    accent: '#06B6D4',
    containerBg: '#1E293B',
    shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    shadowHover: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
    border: '#334155'
  }
};
