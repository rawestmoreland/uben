import { otaUpdateService } from '@/services/otaUpdateService';
import { isSafeToReload } from '@/utils/otaUpdate';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Keeps the app on the latest OTA update without waiting for a cold start.
 * Mount once in the root layout.
 *
 * expo-updates only checks at launch and applies the download on the launch
 * after that, so users who keep the app in the background can sit on an old
 * bundle for days. This checks when the app opens and every time it returns
 * to the foreground (throttled in the service), then restarts onto the new
 * bundle as soon as the user is on a tab screen, never mid-quiz or mid-form.
 */
export function useOtaUpdate(ready: boolean) {
  const pathname = usePathname();
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    const runCheck = async () => {
      const result = await otaUpdateService.checkAndDownload();
      if (!cancelled && result === 'downloaded') setUpdateDownloaded(true);
    };

    runCheck();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [ready]);

  useEffect(() => {
    if (updateDownloaded && isSafeToReload(pathname)) {
      otaUpdateService.reload();
    }
  }, [updateDownloaded, pathname]);
}
