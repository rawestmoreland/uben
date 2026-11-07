import { appUpdateService } from '@/services/appUpdateService';
import type { AppUpdateInfo } from '@/services/appVersion';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

/** Dev-client and preview builds aren't distributed through the stores. */
const IS_STORE_BUILD = !['development', 'preview'].includes(
  Constants.expoConfig?.extra?.appEnv,
);

/**
 * Tells the user when the installed binary is behind the store version
 * published in PocketBase `app_config`.
 *
 * Checks on mount and whenever the app returns to the foreground; the service
 * throttles the actual network call to once a day. Resolves to `update: null`
 * on web, in dev/preview builds, offline, or when nothing is configured.
 *
 * The installed version is the native binary's (`expo-application`), not
 * `Constants.expoConfig.version`, because an OTA update can carry a newer
 * `version` than the binary the user is really running.
 */
export function useAppUpdate() {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);

  useEffect(() => {
    const installedVersion = Application.nativeApplicationVersion;
    if (
      !IS_STORE_BUILD ||
      !installedVersion ||
      (Platform.OS !== 'ios' && Platform.OS !== 'android')
    ) {
      return;
    }
    const platform = Platform.OS;

    let cancelled = false;
    const runCheck = async () => {
      const result = await appUpdateService.check(platform, installedVersion);
      if (!cancelled) setUpdate(result);
    };

    runCheck();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  /** Hide the banner until a newer version ships. A required update can't be dismissed. */
  const dismiss = useCallback(() => {
    if (update?.status !== 'available') return;
    setUpdate(null);
    appUpdateService.dismiss(update.latestVersion);
  }, [update]);

  const openStore = useCallback(() => {
    if (!update) return;
    Linking.openURL(update.storeUrl).catch((error) => {
      console.warn('[AppUpdate] Could not open store URL:', error);
    });
  }, [update]);

  return { update, dismiss, openStore };
}
