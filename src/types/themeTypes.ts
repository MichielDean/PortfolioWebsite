export interface ThemeColors {
  background: string;
  text: string;
  secondaryText: string;
  tertiaryText: string;
  accent: string;
  containerBg: string;
  shadow: string;
  shadowHover: string;
  border: string;
}

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark'
}
export type Theme = ThemeColors;