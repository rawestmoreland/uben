import i18n from '@/constants/i18n';
import { initializeDatabase } from '@/database/db';
import { settingsService } from '@/services/settingsService';
import { syncService } from '@/services/syncService';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Hook that initializes the SQLite database on mount and kicks off a
 * non-blocking PocketBase sync once the local DB is ready.
 *
 * Returns `{ isReady, error }`:
 * - `isReady` is `true` once migrations and seeding have completed.
 * - `error` is set if initialization fails (or if running on web).
 *
 * The sync runs in the background and never blocks `isReady`.
 * If PocketBase is not configured (PB_URL is empty), sync is skipped.
 */
export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setError(new Error('SQLite is not supported on web'));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await initializeDatabase();
        const savedLanguage = await settingsService.getAppLanguage();
        await i18n.changeLanguage(savedLanguage);
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (err) {
        console.error('[DB] Initialization failed:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Non-blocking sync: fire after DB is ready, don't await
  useEffect(() => {
    if (!isReady) return;

    syncService.syncIfOnline().then((result) => {
      if (result.status === 'synced') {
        const { categoriesSynced = 0, nounsSynced = 0 } = result;
        if (categoriesSynced > 0 || nounsSynced > 0) {
          console.log(
            `[App] Background sync: ${categoriesSynced} categories, ${nounsSynced} nouns`,
          );
        }
      } else if (result.status === 'error') {
        console.warn('[App] Background sync error:', result.error);
      }
    });
  }, [isReady]);

  return { isReady, error };
}
