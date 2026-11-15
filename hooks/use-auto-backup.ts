import { backupService } from '@/services/backupService';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * App-wide glue for automatic cloud backup. Mount once in the root layout.
 *
 * Tries when the app opens and when it goes to the background (the moment
 * after practice). `maybeAutoBackup` does all the checks (signed in, Pro,
 * switched on, throttled) and never throws, so this can't affect the quiz.
 */
export function useAutoBackup(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;

    backupService.maybeAutoBackup();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backupService.maybeAutoBackup();
    });
    return () => subscription.remove();
  }, [ready]);
}
