import { Platform } from 'react-native';

/**
 * Design system — bright tournament palette inspired by World Cup music eras:
 * stadium daylight, pitch green, trophy gold, carnival coral, sky blue, teal and
 * magenta accents. Every screen pulls from here for one celebratory look.
 */

export const colors = {
  // Surfaces
  bg: '#F6FAFE',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF7FF',
  surfaceHover: '#E3F0FF',
  border: '#D9E5EF',
  borderStrong: '#A9BBCB',
  borderSoft: '#EEF3F7',

  // Brand / vibrant palette
  primary: '#0AAF48',
  primaryDim: '#008A35',
  primarySoft: 'rgba(10, 175, 72, 0.13)',
  accent: '#FFC400',
  accentSoft: 'rgba(255, 196, 0, 0.18)',
  violet: '#7C4DFF',
  violetSoft: 'rgba(124, 77, 255, 0.13)',
  cyan: '#00A7D8',
  cyanSoft: 'rgba(0, 167, 216, 0.13)',
  coral: '#FF5A3D',
  coralSoft: 'rgba(255, 90, 61, 0.13)',
  pink: '#F2054F',
  pinkSoft: 'rgba(242, 5, 79, 0.12)',
  blue: '#0B74E5',
  blueSoft: 'rgba(11, 116, 229, 0.12)',
  navy: '#07143B',
  ink: '#061338',
  stadium: '#E9F5FF',

  // Status
  live: '#F2053E',
  liveSoft: 'rgba(242, 5, 62, 0.12)',
  win: '#0AAF48',
  draw: '#6A7C86',
  loss: '#D64545',

  // Text
  text: '#071323',
  textMuted: '#536174',
  textFaint: '#8B9AA8',
  onPrimary: '#FFFFFF',
  onAccent: '#241B00',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 8,
  xl: 12,
  bubble: 12,
  pill: 999,
} as const;

export const font = {
  size: {
    xxs: 10,
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 36,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
} as const;

function alphaColor(color: string, alpha: number) {
  if (!color.startsWith('#') || color.length !== 7) return color;

  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const shadow = {
  card: Platform.select({
    web: {
      boxShadow: '0 5px 12px rgba(11, 92, 117, 0.10)',
    },
    default: {
      shadowColor: '#0B5C75',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
  }),
} as const;

/** Small festival lift for featured cards. */
export function glow(color: string) {
  return Platform.select({
    web: {
      boxShadow: `0 7px 16px ${alphaColor(color, 0.16)}`,
    },
    default: {
      shadowColor: color,
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
    },
  });
}

/**
 * Rotating "Today" cards: sunshine, pitch, sky and festival accents.
 */
export const bubble: { accent: string; grad: readonly [string, string] }[] = [
  { accent: colors.primary, grad: ['rgba(18, 168, 107, 0.16)', 'rgba(255, 255, 255, 0.96)'] },
  { accent: colors.coral, grad: ['rgba(255, 90, 61, 0.16)', 'rgba(255, 255, 255, 0.96)'] },
  { accent: colors.cyan, grad: ['rgba(0, 175, 199, 0.15)', 'rgba(255, 255, 255, 0.96)'] },
  { accent: colors.accent, grad: ['rgba(247, 184, 1, 0.20)', 'rgba(255, 255, 255, 0.96)'] },
  { accent: colors.pink, grad: ['rgba(232, 62, 140, 0.13)', 'rgba(255, 255, 255, 0.96)'] },
];
