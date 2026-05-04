/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, appPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme];
}

/** Returns the full PlayARM color palette for the current color scheme. */
export function useAppTheme() {
  const scheme = useColorScheme();
  return appPalette[scheme === 'dark' ? 'dark' : 'light'];
}
