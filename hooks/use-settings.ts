import i18n from '@/constants/i18n';
import { settingsService } from '@/services/settingsService';
import { resolveAppLanguage, type AppLanguage } from '@/types/language';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to read and toggle the "Show English Hint" setting.
 *
 * - Loads the persisted value on mount.
 * - `setShowEnglishHint` writes to the database immediately.
 */
export function useSettings() {
  const [showEnglishHint, setShowEnglishHintState] = useState(true);
  const [eszettPreference, setEszettPreferenceState] = useState<
    'eszett' | 'ss'
  >('eszett');
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>('en');
  const [adjectiveDeclensionDifficulty, setAdjectiveDeclensionDifficultyState] =
    useState<'standard' | 'advanced'>('standard');
  const [isLoading, setIsLoading] = useState(true);

  // ── Load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [englishHint, eszett, language, adjectiveDifficulty] =
          await Promise.all([
            settingsService.getShowEnglishHint(),
            settingsService.getEszettPreference(),
            settingsService.getAppLanguage(
              resolveAppLanguage(i18n.language),
            ),
            settingsService.getAdjectiveDeclensionDifficulty(),
          ]);
        if (!cancelled) {
          setShowEnglishHintState(englishHint);
          setEszettPreferenceState(eszett);
          setAppLanguageState(language);
          setAdjectiveDeclensionDifficultyState(adjectiveDifficulty);
        }
      } catch (error) {
        console.error('[Settings] Failed to load settings:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Toggle + persist ──────────────────────────────────────────────

  const setShowEnglishHint = useCallback(async (enabled: boolean) => {
    setShowEnglishHintState(enabled);
    try {
      await settingsService.setShowEnglishHint(enabled);
    } catch (error) {
      console.error('[Settings] Failed to save setting:', error);
      // Revert optimistic update on failure
      setShowEnglishHintState(!enabled);
    }
  }, []);

  const setEszettPreference = useCallback(
    async (preference: 'eszett' | 'ss') => {
      setEszettPreferenceState(preference);
      try {
        await settingsService.setEszettPreference(preference);
      } catch (error) {
        console.error('[Settings] Failed to save eszett preference:', error);
        // Revert optimistic update on failure
        setEszettPreferenceState(preference === 'eszett' ? 'ss' : 'eszett');
      }
    },
    [],
  );

  const setAppLanguage = useCallback(
    async (language: AppLanguage) => {
      const previous = appLanguage;
      setAppLanguageState(language);
      try {
        await settingsService.setAppLanguage(language);
        await i18n.changeLanguage(language);
      } catch (error) {
        console.error('[Settings] Failed to save app language:', error);
        // Revert optimistic update on failure
        setAppLanguageState(previous);
      }
    },
    [appLanguage],
  );

  const setAdjectiveDeclensionDifficulty = useCallback(
    async (difficulty: 'standard' | 'advanced') => {
      const previous = adjectiveDeclensionDifficulty;
      setAdjectiveDeclensionDifficultyState(difficulty);
      try {
        await settingsService.setAdjectiveDeclensionDifficulty(difficulty);
      } catch (error) {
        console.error(
          '[Settings] Failed to save adjective declension difficulty:',
          error,
        );
        // Revert optimistic update on failure
        setAdjectiveDeclensionDifficultyState(previous);
      }
    },
    [adjectiveDeclensionDifficulty],
  );

  return {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    appLanguage,
    setAppLanguage,
    adjectiveDeclensionDifficulty,
    setAdjectiveDeclensionDifficulty,
    isLoading,
  };
}
