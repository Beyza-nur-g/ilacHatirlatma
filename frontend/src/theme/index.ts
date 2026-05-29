export type ThemeKey = 'light' | 'ocean' | 'sunset';

const base = {
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
    h3: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
    h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    h5: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
    button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24, round: 9999 },
  shadows: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8 },
  },
};

export const themePresets = {
  light: {
    key: 'light' as ThemeKey,
    name: 'Aydinlik',
    colors: {
      primary: '#4A90E2',
      primaryLight: '#6BA3E8',
      primaryDark: '#357ABD',
      secondary: '#50C878',
      secondaryLight: '#6FD98E',
      secondaryDark: '#3FA861',
      success: '#2E9E5B',
      warning: '#F59E0B',
      error: '#E5484D',
      info: '#2196F3',
      medicineColors: {
        blue: '#A8D8FF', pink: '#FFB3E6', green: '#B3FFB3', yellow: '#FFEB99', purple: '#D4B3FF', orange: '#FFCBA4', red: '#FFB3B3', teal: '#B3FFE6', lavender: '#E6D4FF', peach: '#FFD9B3',
      },
      white: '#FFFFFF', black: '#000000',
      gray50: '#FAFAFA', gray100: '#F5F5F5', gray200: '#EEEEEE', gray300: '#E0E0E0', gray400: '#BDBDBD', gray500: '#9E9E9E', gray600: '#757575', gray700: '#616161', gray800: '#424242', gray900: '#212121',
      background: '#F8F9FA', backgroundElevated: '#FFFFFF', cardBackground: '#FFFFFF', cardShadow: 'rgba(0, 0, 0, 0.08)',
      textPrimary: '#212121', textSecondary: '#667085', textDisabled: '#BDBDBD', textOnPrimary: '#FFFFFF', border: '#E4E7EC',
    },
  },
  ocean: {
    key: 'ocean' as ThemeKey,
    name: 'Okyanus',
    colors: {
      primary: '#0F766E', primaryLight: '#14B8A6', primaryDark: '#115E59', secondary: '#0891B2', secondaryLight: '#22D3EE', secondaryDark: '#0E7490', success: '#16A34A', warning: '#F59E0B', error: '#DC2626', info: '#0EA5E9',
      medicineColors: {
        blue: '#7DD3FC', pink: '#FBCFE8', green: '#BBF7D0', yellow: '#FDE68A', purple: '#DDD6FE', orange: '#FDBA74', red: '#FCA5A5', teal: '#99F6E4', lavender: '#E9D5FF', peach: '#FED7AA',
      },
      white: '#FFFFFF', black: '#000000',
      gray50: '#F8FAFC', gray100: '#F1F5F9', gray200: '#E2E8F0', gray300: '#CBD5E1', gray400: '#94A3B8', gray500: '#64748B', gray600: '#475569', gray700: '#334155', gray800: '#1E293B', gray900: '#0F172A',
      background: '#ECFEFF', backgroundElevated: '#FFFFFF', cardBackground: '#FFFFFF', cardShadow: 'rgba(2, 132, 199, 0.1)', textPrimary: '#0F172A', textSecondary: '#475569', textDisabled: '#94A3B8', textOnPrimary: '#FFFFFF', border: '#CFFAFE',
    },
  },
  sunset: {
    key: 'sunset' as ThemeKey,
    name: 'Gun Batimi',
    colors: {
      primary: '#C2410C', primaryLight: '#F97316', primaryDark: '#9A3412', secondary: '#DB2777', secondaryLight: '#F472B6', secondaryDark: '#BE185D', success: '#16A34A', warning: '#D97706', error: '#DC2626', info: '#F97316',
      medicineColors: {
        blue: '#BFDBFE', pink: '#F9A8D4', green: '#BBF7D0', yellow: '#FDE68A', purple: '#E9D5FF', orange: '#FDBA74', red: '#FCA5A5', teal: '#99F6E4', lavender: '#DDD6FE', peach: '#FED7AA',
      },
      white: '#FFFFFF', black: '#000000',
      gray50: '#FFF7ED', gray100: '#FFEDD5', gray200: '#FED7AA', gray300: '#FDBA74', gray400: '#FB923C', gray500: '#F97316', gray600: '#EA580C', gray700: '#C2410C', gray800: '#9A3412', gray900: '#7C2D12',
      background: '#FFF7ED', backgroundElevated: '#FFFFFF', cardBackground: '#FFFFFF', cardShadow: 'rgba(194, 65, 12, 0.1)', textPrimary: '#431407', textSecondary: '#9A3412', textDisabled: '#FDBA74', textOnPrimary: '#FFFFFF', border: '#FED7AA',
    },
  },
};

export const colors = themePresets.light.colors;
export const typography = base.typography;
export const spacing = base.spacing;
export const borderRadius = base.borderRadius;
export const shadows = base.shadows;

export type AppTheme = (typeof themePresets)[ThemeKey];
