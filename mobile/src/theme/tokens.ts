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
  500: '#F4A340', // warm amber — the "gold" for credits / treats
  600: '#DC8A28',
} as const;

// Warm accent — heat / streak / energy. A friendly ORANGE (not red): appetite + warmth without
// the harshness of coral-red. Distinct from the gold ACCENT used for credits/achievements.
const EMBER = {
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316', // primary warm accent (orange)
  600: '#EA580C',
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

export const palette = { ...BRAND, accent: ACCENT, ember: EMBER, neutral: NEUTRAL, ...SEMANTIC } as const;

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
  // Warm halo — for energetic/appetite surfaces (the splash, streak flames).
  glowWarm: {
    shadowColor: EMBER[500],
    shadowOpacity: 0.4,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;

// Soft tinted color-coding for food categories (used on detected-food + ingredient chips).
export const categoryColors: Record<string, { bg: string; fg: string }> = {
  vegetable: { bg: '#DBF1E3', fg: '#15894F' },
  fruit: { bg: '#FCE0EA', fg: '#C43A6E' },
  protein: { bg: '#FCE5D8', fg: '#B0552B' },
  grain: { bg: '#F8ECCF', fg: '#9A7A1C' },
  dairy: { bg: '#E6ECFA', fg: '#46598F' },
  sauce: { bg: '#FDE9CC', fg: '#C47A12' },
  other: { bg: NEUTRAL[100], fg: NEUTRAL[600] },
};

// ── Season palettes — drive seasonal habitat tinting + HarvestMeter strokes ──
// Each palette is consumed by SageHomeHabitat (background wash) and HarvestMeter (stroke gradient).
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export const seasonPalette: Record<
  Season,
  { wash: readonly [string, string]; ring: readonly string[]; icon: string; label: string }
> = {
  spring: {
    wash: ['#FCE6EE', '#E8F5E0'], // soft pink → soft green (blossoms + new growth)
    ring: ['#F472B6', '#34D399', '#A7F3D0'],
    icon: 'sprout',
    label: 'Spring',
  },
  summer: {
    wash: ['#FFF0CC', '#FFE3B5'], // warm sun + golden field
    ring: ['#F59E0B', '#FACC15', '#FDE68A'],
    icon: 'sun',
    label: 'Summer',
  },
  fall: {
    wash: ['#FFE0C4', '#F5C690'], // pumpkin + warm amber leaves
    ring: ['#EA580C', '#F97316', '#FB923C'],
    icon: 'leaf',
    label: 'Fall',
  },
  winter: {
    wash: ['#DDE7F0', '#EEF1F5'], // frost + cool sky
    ring: ['#60A5FA', '#93C5FD', '#DBEAFE'],
    icon: 'snowflake',
    label: 'Winter',
  },
};

const base = { spacing, radius, iconSize, typography, fonts, shadow, categoryColors, seasonPalette };

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
    accent: ACCENT[600],
    accentSoft: '#FBEEDA', // soft amber — credits/treats read as "gold"
    energy: EMBER[500],
    energySoft: '#FFEDD5',
    love: '#E5484D', // hearts / bond — a clean true red

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
    dangerSoft: '#FBE3E3',
    success: SEMANTIC.success,
    warning: SEMANTIC.warning,
  },
  gradients: {
    brand: [BRAND[400], BRAND[600]] as [string, string],
    hero: [BRAND[50], NEUTRAL.cream] as [string, string],
    // Warm, readable hero wash (pale peach → cream) for food/cooking surfaces — dark text stays legible.
    heroWarm: ['#FFEAE0', NEUTRAL.cream] as [string, string],
    accent: [ACCENT[300], ACCENT[500]] as [string, string],
    // Warm sunrise — appetite + energy. Splash + celebratory/energetic surfaces.
    appetite: [EMBER[500], ACCENT[500]] as [string, string],
    // Iridescent "AI" spectrum — the Sage avatar ring. Bridges the brand green into a holographic
    // cyan→indigo→pink sweep so the companion reads as intelligent / alive.
    aiRing: ['#1FA971', '#22D3EE', '#ee5e29','#6366F1', '#EC4899'] as [string, string, string, string, string],
    glow: [BRAND[100], 'rgba(31,169,113,0)'] as [string, string],
    // Soft sage→white wash for a raised surface (e.g. the AI chat bubble) — distinct from cream bg.
    bubble: [BRAND[50], NEUTRAL[0]] as [string, string],
  },
};

export const darkTheme = {
  ...base,
  mode: 'dark' as const,
  colors: {
    primary: '#3BBE88', // brighter pop on the lighter dark ramp
    primaryDark: BRAND[500],
    primarySoft: '#1C2E25',
    onPrimary: NEUTRAL[0], // white reads correctly on green CTAs/gradients in dark mode too
    accent: ACCENT[500],
    accentSoft: '#2E2118',
    energy: EMBER[400], // brighter orange reads better on dark
    energySoft: '#33271C',
    love: '#FF6369', // hearts / bond — clean red on dark

    // Brighter, warmer ramp — cozy bistro, not a clinical void.
    background: '#18201B',
    surface: '#222A25',
    card: '#27322B',
    elevated: '#313C34',

    text: '#EAF1EC',
    title: '#F4F8F5',
    muted: '#A6B2AA',
    subtle: '#76837A',
    border: '#3A453E',
    divider: '#2D372F',

    danger: '#FF6369',
    dangerSoft: '#3A2422',
    success: '#3BBE88',
    warning: ACCENT[500],
  },
  gradients: {
    brand: [BRAND[400], BRAND[600]] as [string, string],
    hero: ['#243029', '#18201B'] as [string, string],
    heroWarm: ['#33241C', '#18201B'] as [string, string],
    accent: [ACCENT[300], ACCENT[500]] as [string, string],
    appetite: [EMBER[500], ACCENT[500]] as [string, string],
    aiRing: ['#34D399', '#22D3EE', '#818CF8', '#F472B6'] as [string, string, string, string],
    glow: ['#244836', 'rgba(36,72,54,0)'] as [string, string],
    // Subtle raised-surface wash for dark mode (elevated → card).
    bubble: ['#313C34', '#27322B'] as [string, string],
  },
};

export type Theme = typeof lightTheme;
export type ThemeColors = keyof Theme['colors'];
