/**
 * ⭐ SINGLE SOURCE OF BRANDING — "Sage & Cream" ⭐
 *
 * Change the app's entire look from THIS FILE only. Nothing in the app hardcodes a hex value,
 * font, radius, or spacing — every component reads `useTheme()`.
 *
 * To re-skin the whole app: edit the `BRAND` ramp (and optionally `ACCENT`). Everything —
 * buttons, icons, tab bar, charts, highlights, dark mode — follows automatically.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  1. BRAND — the only thing you usually touch to re-skin the app
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  50: '#ECF7F1',
  100: '#D2ECE0',
  200: '#A6D9C2',
  300: '#6FC29D',
  400: '#34B27F',
  500: '#1FA971', // primary
  600: '#16835A',
  700: '#0F5F41',
} as const;

const ACCENT = {
  300: '#FBD9A6',
  500: '#F4A340', // warm amber
  600: '#DC8A28',
} as const;

// Warm, slightly green-tinted neutrals so cream + sage feel cohesive (not clinical gray).
const NEUTRAL = {
  0: '#FFFFFF',
  cream: '#FBFAF6',
  sand: '#F4F1EA',
  100: '#EFEBE1',
  200: '#E7E2D6',
  300: '#D8D2C4',
  400: '#A9A597',
  500: '#7C7A6E',
  600: '#5E5C52',
  700: '#3B3A33',
  900: '#14201B',
} as const;

const SEMANTIC = {
  danger: '#E5484D',
  success: BRAND[500],
  warning: ACCENT[500],
} as const;

export const palette = { ...BRAND, accent: ACCENT, neutral: NEUTRAL, ...SEMANTIC } as const;

// ─────────────────────────────────────────────────────────────────────────────
//  2. Scale tokens (shared across light/dark)
// ─────────────────────────────────────────────────────────────────────────────
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 44, xxxl: 64 } as const;
export const radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;
export const iconSize = { sm: 16, md: 22, lg: 28, xl: 44 } as const;

/**
 * Font families. Loaded in app/_layout.tsx via @expo-google-fonts.
 * Display = Fraunces (characterful serif); UI/body = Plus Jakarta Sans (clean modern sans).
 */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const typography = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.display, fontSize: 23, lineHeight: 29, letterSpacing: -0.3 },
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, letterSpacing: 0 },
  label: { fontFamily: fonts.semibold, fontSize: 15.5, lineHeight: 20, letterSpacing: 0.1 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  overline: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 14, letterSpacing: 1.1 },
} as const;

// Soft, layered shadows (iOS) + elevation (Android).
const shadow = {
  sm: {
    shadowColor: NEUTRAL[900],
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: NEUTRAL[900],
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lg: {
    shadowColor: NEUTRAL[900],
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  glow: {
    shadowColor: BRAND[500],
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;

// Soft tinted color-coding for food categories (used on detected-food + ingredient chips).
export const categoryColors: Record<string, { bg: string; fg: string }> = {
  vegetable: { bg: '#E7F5EC', fg: '#1E7A4D' },
  fruit: { bg: '#FCEAF0', fg: '#B43E6B' },
  protein: { bg: '#F6E9E1', fg: '#A85A33' },
  grain: { bg: '#F6EFDD', fg: '#9A7B23' },
  dairy: { bg: '#EEF1F7', fg: '#516089' },
  sauce: { bg: '#FDF0DD', fg: '#C2841E' },
  other: { bg: NEUTRAL[100], fg: NEUTRAL[600] },
};

const base = { spacing, radius, iconSize, typography, fonts, shadow, categoryColors };

// ─────────────────────────────────────────────────────────────────────────────
//  3. Semantic color mapping (light + dark) — components only read these names
// ─────────────────────────────────────────────────────────────────────────────
export const lightTheme = {
  ...base,
  mode: 'light' as const,
  colors: {
    primary: BRAND[500],
    primaryDark: BRAND[600],
    primarySoft: BRAND[50],
    onPrimary: NEUTRAL[0],
    accent: ACCENT[500],
    accentSoft: BRAND[50],

    background: NEUTRAL.cream,
    surface: NEUTRAL.sand,
    card: NEUTRAL[0],
    elevated: NEUTRAL[0],

    text: NEUTRAL[900],
    title: NEUTRAL[900],
    muted: NEUTRAL[500],
    subtle: NEUTRAL[400],
    border: NEUTRAL[200],
    divider: NEUTRAL[100],

    danger: SEMANTIC.danger,
    success: SEMANTIC.success,
    warning: SEMANTIC.warning,
  },
  gradients: {
    brand: [BRAND[400], BRAND[600]] as [string, string],
    hero: [BRAND[50], NEUTRAL.cream] as [string, string],
    accent: [ACCENT[300], ACCENT[500]] as [string, string],
    glow: [BRAND[100], 'rgba(31,169,113,0)'] as [string, string],
    // Soft sage→white wash for a raised surface (e.g. the AI chat bubble) — distinct from cream bg.
    bubble: [BRAND[50], NEUTRAL[0]] as [string, string],
  },
};

export const darkTheme = {
  ...base,
  mode: 'dark' as const,
  colors: {
    primary: BRAND[400],
    primaryDark: BRAND[500],
    primarySoft: '#15271F',
    onPrimary: NEUTRAL[900],
    accent: ACCENT[500],
    accentSoft: '#15271F',

    background: '#0F1512',
    surface: '#18201C',
    card: '#1B231E',
    elevated: '#222B25',

    text: '#EAF1EC',
    title: '#F4F8F5',
    muted: '#9AA79F',
    subtle: '#6E7A72',
    border: '#2A332D',
    divider: '#232B26',

    danger: '#FF6369',
    success: BRAND[400],
    warning: ACCENT[500],
  },
  gradients: {
    brand: [BRAND[400], BRAND[600]] as [string, string],
    hero: ['#16271F', '#0F1512'] as [string, string],
    accent: [ACCENT[300], ACCENT[500]] as [string, string],
    glow: ['#1C3A2C', 'rgba(28,58,44,0)'] as [string, string],
    // Subtle raised-surface wash for dark mode (elevated → card).
    bubble: ['#222B25', '#1B231E'] as [string, string],
  },
};

export type Theme = typeof lightTheme;
export type ThemeColors = keyof Theme['colors'];
