import i18n from '@/constants/i18n';
import { settingsService } from '@/services/settingsService';
import { syncService } from '@/services/syncService';
import { resolveAppLanguage, type AppLanguage } from '@/types/language';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to read and toggle the user's settings.
 *
 * - Loads the persisted values on mount.
 * - Setters write to the database immediately.
 * - `setAppLanguage` also downloads the noun translations for the new language;
 *   `syncingLanguage` is set while that download runs so the UI can block on it.
 */
export function useSettings() {
  const [showEnglishHint, setShowEnglishHintState] = useState(true);
  const [eszettPreference, setEszettPreferenceState] = useState<
    'eszett' | 'ss'
  >('eszett');
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>('en');
  const [adjectiveDeclensionDifficulty, setAdjectiveDeclensionDifficultyState] =
    useState<'standard' | 'advanced'>('standard');
  const [verbPrepositionCaseStep, setVerbPrepositionCaseStepState] =
    useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingLanguage, setSyncingLanguage] = useState<AppLanguage | null>(
    null,
  );
  const [translationSyncFailed, setTranslationSyncFailed] = useState(false);

  // ── Load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [
          englishHint,
          eszett,
          language,
          adjectiveDifficulty,
          caseStep,
        ] = await Promise.all([
          settingsService.getShowEnglishHint(),
          settingsService.getEszettPreference(),
          settingsService.getAppLanguage(resolveAppLanguage(i18n.language)),
          settingsService.getAdjectiveDeclensionDifficulty(),
          settingsService.getVerbPrepositionCaseStep(),
        ]);
        if (!cancelled) {
          setShowEnglishHintState(englishHint);
          setEszettPreferenceState(eszett);
          setAppLanguageState(language);
          setAdjectiveDeclensionDifficultyState(adjectiveDifficulty);
          setVerbPrepositionCaseStepState(caseStep);
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
      setTranslationSyncFailed(false);
      try {
        await settingsService.setAppLanguage(language);

        // Download this language's translations BEFORE switching the UI so the
        // hints are already in SQLite when screens re-read them. A failed
        // download (offline) is not fatal: hints fall back to English and the
        // next launch's sync retries, since the per-language timestamp is only
        // stored after a successful pull.
        setSyncingLanguage(language);
        const result = await syncService.syncNounTranslations(language);
        setTranslationSyncFailed(result.status === 'error');

        await i18n.changeLanguage(language);
      } catch (error) {
        console.error('[Settings] Failed to save app language:', error);
        // Revert optimistic update on failure
        setAppLanguageState(previous);
      } finally {
        setSyncingLanguage(null);
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

  const setVerbPrepositionCaseStep = useCallback(async (enabled: boolean) => {
    setVerbPrepositionCaseStepState(enabled);
    try {
      await settingsService.setVerbPrepositionCaseStep(enabled);
    } catch (error) {
      console.error('[Settings] Failed to save case step setting:', error);
      // Revert optimistic update on failure
      setVerbPrepositionCaseStepState(!enabled);
    }
  }, []);

  return {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    appLanguage,
    setAppLanguage,
    syncingLanguage,
    translationSyncFailed,
    adjectiveDeclensionDifficulty,
    setAdjectiveDeclensionDifficulty,
    verbPrepositionCaseStep,
    setVerbPrepositionCaseStep,
    isLoading,
  };
}
