import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/services/settingsService';
import i18n from '@/constants/i18n';

// Promo codes that disable ads, stored as a comma-separated env var.
// e.g. EXPO_PUBLIC_PROMO_CODES=UBEN2024,PARTNER01
const PROMO_CODES: string[] = (process.env.EXPO_PUBLIC_PROMO_CODES ?? '')
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

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
  const [adsDisabled, setAdsDisabledState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [englishHint, eszett, language, adsOff] = await Promise.all([
          settingsService.getShowEnglishHint(),
          settingsService.getEszettPreference(),
          settingsService.getAppLanguage(),
          settingsService.getAdsDisabled(),
        ]);
        if (!cancelled) {
          setShowEnglishHintState(englishHint);
          setEszettPreferenceState(eszett);
          setAppLanguageState(language);
          setAdsDisabledState(adsOff);
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

  /** Attempt to redeem a promo code. Returns 'success' or 'invalid'. */
  const redeemPromoCode = useCallback(
    async (code: string): Promise<'success' | 'invalid'> => {
      if (PROMO_CODES.includes(code.trim().toUpperCase())) {
        setAdsDisabledState(true);
        try {
          await settingsService.setAdsDisabled(true);
        } catch (error) {
          console.error('[Settings] Failed to save ads_disabled:', error);
          setAdsDisabledState(false);
          return 'invalid';
        }
        return 'success';
      }
      return 'invalid';
    },
    [],
  );

  return {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    appLanguage,
    setAppLanguage,
    adsDisabled,
    redeemPromoCode,
    isLoading,
  };
}
