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
  const [isLoading, setIsLoading] = useState(true);

  // ── Load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const value = await settingsService.getShowEnglishHint();
        if (!cancelled) {
          setShowEnglishHintState(value);
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

  return { showEnglishHint, setShowEnglishHint, isLoading };
}
