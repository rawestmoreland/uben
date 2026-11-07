import { useSettings } from '@/hooks/use-settings';
import { applyGermanTextPreference } from '@/utils/germanText';
import { useCallback } from 'react';

/**
 * Returns a function that renders German text (vocabulary, example sentences,
 * grammar tables) in the user's ß / ss spelling preference. Wrap every German
 * string that is shown to the user; UI text in the app language is not German
 * and must not go through it.
 */
export function useGermanText(): (text: string) => string {
  const { eszettPreference } = useSettings();
  return useCallback(
    (text: string) => applyGermanTextPreference(text, eszettPreference),
    [eszettPreference],
  );
}
