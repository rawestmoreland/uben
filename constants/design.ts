import { Platform, ViewStyle } from 'react-native';

// ── Colors ───────────────────────────────────────────────────────────

export const AppColors = {
  // Base
  black: '#000000',
  white: '#FFFFFF',

  // Accent colors (bright, saturated)
  yellow: '#FFE500', // Primary accent
  blue: '#0066FF', // Secondary accent
  red: '#FF3333', // Error/wrong answer
  green: '#00CC66', // Success/correct answer
  purple: '#9933FF', // Tertiary accent

  // Backgrounds
  cream: '#FFF8E1', // Warm off-white
  lightGray: '#F5F5F5', // Cool off-white

  // Text
  textPrimary: '#000000',
  textSecondary: '#333333',
} as const;

// ── Typography ───────────────────────────────────────────────────────

export const Typography = {
  // Sizes
  huge: 48,
  title: 32,
  heading: 24,
  body: 16,
  small: 14,
  tiny: 12,

  // Weights
  bold: '700' as const,
  semibold: '600' as const,
  regular: '400' as const,

  // System fonts
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
} as const;

// ── Spacing ──────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── Layout ───────────────────────────────────────────────────────────

export const Layout = {
  borderWidth: 3, // Thick borders
  borderWidthThin: 2, // Slightly thinner
  borderRadius: 0, // Sharp corners default
  borderRadiusSm: 4, // Minimal rounding if needed
  buttonHeight: 56, // Chunky, pressable
  cardPadding: 16,
  screenPadding: 20,
} as const;

// ── Shadow ───────────────────────────────────────────────────────────

/** Hard shadow with no blur — the neo-brutalist signature. */
export const shadowStyle: ViewStyle = Platform.select({
  ios: {
    shadowColor: AppColors.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  android: {
    elevation: 8,
  },
  default: {
    shadowColor: AppColors.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
}) as ViewStyle;

/** Smaller hard shadow for secondary elements. */
export const shadowStyleSmall: ViewStyle = Platform.select({
  ios: {
    shadowColor: AppColors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: AppColors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
}) as ViewStyle;
