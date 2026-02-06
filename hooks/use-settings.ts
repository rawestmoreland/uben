import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/services/settingsService';

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
  const [isLoading, setIsLoading] = useState(true);

  // ── Load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [englishHint, eszett] = await Promise.all([
          settingsService.getShowEnglishHint(),
          settingsService.getEszettPreference(),
        ]);
        if (!cancelled) {
          setShowEnglishHintState(englishHint);
          setEszettPreferenceState(eszett);
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

  return {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    isLoading,
  };
}
