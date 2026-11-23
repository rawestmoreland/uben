import {
  OTA_CHECK_INTERVAL_MS,
  shouldCheckForUpdate,
  type InstalledUpdate,
} from '@/utils/otaUpdate';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * Dev-client and preview builds get their JS from Metro / their own channel,
 * and `__DEV__` also covers a local `expo run:ios|android`.
 */
const OTA_ENABLED =
  !__DEV__ &&
  Platform.OS !== 'web' &&
  Updates.isEnabled &&
  Constants.expoConfig?.extra?.appEnv !== 'development';

export type OtaCheckResult = 'downloaded' | 'none' | 'skipped' | 'error';

let lastCheckedAtMs: number | null = null;
let checking = false;

/**
 * Looks for a new OTA update and downloads it. The running bundle is not
 * touched: call `reload()` at a moment when restarting is safe.
 *
 * Throttled to `OTA_CHECK_INTERVAL_MS` and never throws, so callers can fire
 * it on every foreground without caring.
 */
async function checkAndDownload(): Promise<OtaCheckResult> {
  if (!OTA_ENABLED || checking) return 'skipped';
  const now = Date.now();
  if (!shouldCheckForUpdate(now, lastCheckedAtMs, OTA_CHECK_INTERVAL_MS)) {
    return 'skipped';
  }

  checking = true;
  try {
    const check = await Updates.checkForUpdateAsync();
    // Only a completed check counts, so a failed (offline) one is retried
    // on the next foreground instead of waiting out the interval.
    lastCheckedAtMs = now;
    if (!check.isAvailable) return 'none';
    const fetched = await Updates.fetchUpdateAsync();
    return fetched.isNew ? 'downloaded' : 'none';
  } catch (error) {
    console.warn('[OTA] Update check failed:', error);
    return 'error';
  } finally {
    checking = false;
  }
}

/** Restarts the app on the downloaded update. Never throws. */
async function reload(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[OTA] Reload failed:', error);
  }
}

/** The update this process is running, for the Settings footer. */
function getInstalledUpdate(): InstalledUpdate {
  return {
    updateId: Updates.updateId ?? null,
    createdAt: Updates.createdAt ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}

export const otaUpdateService = {
  checkAndDownload,
  reload,
  getInstalledUpdate,
};
