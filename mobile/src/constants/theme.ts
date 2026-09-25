/**
 * Africa Wallet Design-Tokens (siehe Design-Canvas "Africa Wallet App").
 * Die App ist bewusst nur hell gestaltet; `Colors.dark` spiegelt `light`,
 * damit ThemedText/ThemedView überall dieselben Farben liefern.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  sand: '#F6F2EA',
  sandDeep: '#E7DFCF',
  line: '#D9D2C3',
  divider: '#EFE9DD',
  white: '#FFFFFF',
  ink: '#1B1A17',
  inkMuted: '#5E594F',
  inkFaint: '#9A9384',
  forest: '#1F4D3A',
  forestSoft: '#2B5F49',
  forestLine: '#3D7059',
  mint: '#CFE0D6',
  positive: '#1F6B45',
  ochre: '#E0A64B',
  ochreSoft: '#FBEBD0',
  ochreInk: '#7A4A0C',
  night: '#141412',
  nightRaised: '#22211E',
  nightButton: '#2A2925',
  danger: '#B42318',
} as const;

const light = {
  text: Palette.ink,
  background: Palette.sand,
  backgroundElement: Palette.white,
  backgroundSelected: Palette.line,
  textSecondary: Palette.inkMuted,
} as const;

export const Colors = { light, dark: light } as const;

export type ThemeColor = keyof typeof Colors.light;

// Namen entsprechen den Keys, unter denen die Fonts in app/_layout.tsx geladen werden
export const FontFamily = {
  display: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
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

export const Radius = {
  input: 14,
  button: 16,
  card: 24,
  tile: 18,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
