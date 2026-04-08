/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ── Full PlayARM palette ──────────────────────────────────────────────────────
export const appPalette = {
  dark: {
    bg0: '#0a0c10', bg1: '#0d1117', bg2: '#161b22', bg3: '#21262d',
    border: '#30363d', borderSubtle: '#21262d',
    text: '#f0f6fc', textSec: '#e6edf3', textBody: '#c9d1d9',
    textMuted: '#8b949e', textDim: '#484f58', textGhost: '#30363d',
    accent: '#2f81f7',
    accentBg: 'rgba(47,129,247,0.10)', accentBorder: 'rgba(47,129,247,0.40)',
    accentFaint: 'rgba(47,129,247,0.07)', accentStrong: 'rgba(47,129,247,0.22)',
    accentLight: '#58a6ff', accentCode: '#79c0ff',
    green: '#22c55e', greenCode: '#7ee787',
    greenBg: 'rgba(34,197,94,0.10)', greenBorder: 'rgba(34,197,94,0.30)',
    purple: '#818cf8', purpleDark: '#a371f7', purpleBg: 'rgba(129,140,248,0.08)',
    amber: '#d29922', amberBg: 'rgba(210,153,34,0.10)', amberBorder: 'rgba(210,153,34,0.40)',
    red: '#f85149', redBg: 'rgba(248,81,73,0.08)', redBorder: 'rgba(248,81,73,0.25)',
    cyan: '#38bdf8', orange: '#f97316',
    orangeBg: 'rgba(249,115,22,0.10)', orangeBorder: 'rgba(249,115,22,0.40)',
    sep: 'rgba(255,255,255,0.04)',
  },
  light: {
    bg0: '#eef1f4', bg1: '#ffffff', bg2: '#f6f8fa', bg3: '#eaeef2',
    border: '#d0d7de', borderSubtle: '#e1e4e8',
    text: '#1f2328', textSec: '#24292f', textBody: '#3d444d',
    textMuted: '#57606a', textDim: '#8c959f', textGhost: '#c8d0d8',
    accent: '#0969da',
    accentBg: 'rgba(9,105,218,0.08)', accentBorder: 'rgba(9,105,218,0.35)',
    accentFaint: 'rgba(9,105,218,0.05)', accentStrong: 'rgba(9,105,218,0.18)',
    accentLight: '#0969da', accentCode: '#0550ae',
    green: '#1a7f37', greenCode: '#116329',
    greenBg: 'rgba(26,127,55,0.10)', greenBorder: 'rgba(26,127,55,0.25)',
    purple: '#6f42c1', purpleDark: '#8250df', purpleBg: 'rgba(111,66,193,0.08)',
    amber: '#9a6700', amberBg: 'rgba(154,103,0,0.10)', amberBorder: 'rgba(154,103,0,0.35)',
    red: '#d1242f', redBg: 'rgba(209,36,47,0.08)', redBorder: 'rgba(209,36,47,0.25)',
    cyan: '#0598bc', orange: '#bc4c00',
    orangeBg: 'rgba(188,76,0,0.10)', orangeBorder: 'rgba(188,76,0,0.35)',
    sep: 'rgba(0,0,0,0.06)',
  },
} as const;

export type AppPalette = typeof appPalette.dark | typeof appPalette.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
