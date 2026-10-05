import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * React Native's color scheme can also be 'unspecified'; treat that the same
 * as no preference so callers only ever see 'light', 'dark' or null.
 */
export function useColorScheme(): 'light' | 'dark' | null {
  const colorScheme = useRNColorScheme();
  return colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : null;
}
