/**
 * ⭐ SINGLE SOURCE OF BRANDING ⭐
 *
 * Every color, spacing, radius, and type value in the app comes from here.
 * Change `palette` (or any token) and the entire app re-skins — no component
 * hardcodes a hex value or magic number. Light + dark are driven by the same tokens.
 */

export const palette = {
  // Brand ramp — change brand500 to re-color the whole app's primary.
  brand50: '#FFF1EC',
  brand100: '#FFE0D4',
  brand500: '#FF6A3D', // primary
  brand600: '#E8542A',
  brand700: '#C13F1B',

  // Neutrals
  white: '#FFFFFF',
  black: '#0B0B0F',
  gray50: '#F7F7F8',
  gray100: '#EEEEF1',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',

  // Semantic
  danger: '#E5484D',
  success: '#30A46C',
  warning: '#F5A623',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  heading: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  title: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
} as const;

export const shadow = {
  card: {
    shadowColor: palette.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

const base = { spacing, radius, typography, shadow };

export const lightTheme = {
  ...base,
  mode: 'light' as const,
  colors: {
    primary: palette.brand500,
    primaryDark: palette.brand600,
    onPrimary: palette.white,
    background: palette.white,
    surface: palette.gray50,
    card: palette.white,
    text: palette.gray900,
    muted: palette.gray500,
    border: palette.gray200,
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    accentSoft: palette.brand50,
  },
};

export const darkTheme = {
  ...base,
  mode: 'dark' as const,
  colors: {
    primary: palette.brand500,
    primaryDark: palette.brand600,
    onPrimary: palette.white,
    background: palette.black,
    surface: '#15151B',
    card: '#1C1C24',
    text: palette.gray50,
    muted: palette.gray400,
    border: '#2A2A33',
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    accentSoft: '#2A1A12',
  },
};

export type Theme = typeof lightTheme;
