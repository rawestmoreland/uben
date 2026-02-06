import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { initializeDatabase } from '@/database/db';

/**
 * Hook that initializes the SQLite database on mount.
 *
 * Returns `{ isReady, error }`:
 * - `isReady` is `true` once migrations and seeding have completed.
 * - `error` is set if initialization fails (or if running on web).
 *
 * Usage in root layout:
 * ```tsx
 * const { isReady } = useDatabase();
 * if (!isReady) return null; // keep splash screen visible
 * ```
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
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (err) {
        console.error('[DB] Initialization failed:', err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady, error };
}
