import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/services/settingsService';
import i18n from '@/constants/i18n';

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
  const [appLanguage, setAppLanguageState] = useState<'en' | 'it' | 'pl'>('en');
  const [isLoading, setIsLoading] = useState(true);

  // ── Load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [englishHint, eszett, language] = await Promise.all([
          settingsService.getShowEnglishHint(),
          settingsService.getEszettPreference(),
          settingsService.getAppLanguage(),
        ]);
        if (!cancelled) {
          setShowEnglishHintState(englishHint);
          setEszettPreferenceState(eszett);
          setAppLanguageState(language);
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
    async (language: 'en' | 'it' | 'pl') => {
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

  return {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    appLanguage,
    setAppLanguage,
    isLoading,
  };
}
