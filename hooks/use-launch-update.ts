import {
  decideLaunchUpdate,
  LAUNCH_UPDATE_CHECK_TIMEOUT_MS,
  LAUNCH_UPDATE_DOWNLOAD_TIMEOUT_MS,
  LAUNCH_UPDATE_RELOAD_GRACE_MS,
} from '@/services/launchUpdate';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * expo-updates' JS API rejects in development, and its web stub claims to be
 * enabled, so only device builds that can receive OTA updates take part.
 * Preview builds do too (their channel gets the staging updates).
 */
const LAUNCH_UPDATES_ENABLED =
  Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;

/**
 * Shown by expo-updates between the old and the new bundle. Black, like the
 * native splash and the first frame of the animated splash, so the restart
 * reads as part of the launch. (The default is a white screen with a spinner.)
 */
const RELOAD_SCREEN_OPTIONS = {
  backgroundColor: '#000000',
  spinner: { enabled: false },
};

/**
 * Applies a newly published OTA update on the launch that finds it, instead of
 * on the next cold start (see `services/launchUpdate.ts` for the rules).
 *
 * expo-updates checks for an update on every launch and downloads it in the
 * background; this follows that download through `Updates.useUpdates()` (no
 * extra network requests) and, if it finishes while the splash is still up,
 * reloads into the new bundle.
 *
 * Returns `true` once the app may leave the splash screen. It never turns back
 * to `false`, and the app never reloads after that.
 *
 * @param canReload the database has finished initializing, so a reload can't
 *   interrupt startup writes
 */
export function useLaunchUpdate(canReload: boolean): boolean {
  const {
    isStartupProcedureRunning,
    isUpdateAvailable,
    isDownloading,
    isUpdatePending,
  } = Updates.useUpdates();
  const [checkTimedOut, setCheckTimedOut] = useState(false);
  const [downloadTimedOut, setDownloadTimedOut] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  const [released, setReleased] = useState(!LAUNCH_UPDATES_ENABLED);

  const decision = released
    ? 'continue'
    : decideLaunchUpdate({
        enabled: LAUNCH_UPDATES_ENABLED,
        isStartupProcedureRunning,
        isUpdateAvailable,
        isDownloading,
        isUpdatePending,
        canReload,
        checkTimedOut,
        downloadTimedOut,
        reloadFailed,
      });

  // One-way: once the app is let through it stays through (adjusted during
  // render, like the splash state in the root layout).
  if (!released && decision === 'continue') {
    setReleased(true);
  }

  useEffect(() => {
    if (released) return;
    const checkTimer = setTimeout(
      () => setCheckTimedOut(true),
      LAUNCH_UPDATE_CHECK_TIMEOUT_MS,
    );
    const downloadTimer = setTimeout(
      () => setDownloadTimedOut(true),
      LAUNCH_UPDATE_DOWNLOAD_TIMEOUT_MS,
    );
    return () => {
      clearTimeout(checkTimer);
      clearTimeout(downloadTimer);
    };
  }, [released]);

  useEffect(() => {
    if (decision !== 'reload') return;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    // On failure the update still runs on the next cold start.
    Updates.reloadAsync({ reloadScreenOptions: RELOAD_SCREEN_OPTIONS })
      .then(() => {
        graceTimer = setTimeout(() => {
          console.warn('[LaunchUpdate] Reload did not happen, opening the app');
          setReloadFailed(true);
        }, LAUNCH_UPDATE_RELOAD_GRACE_MS);
      })
      .catch((error) => {
        console.warn('[LaunchUpdate] Could not reload into the update:', error);
        setReloadFailed(true);
      });
    return () => clearTimeout(graceTimer);
  }, [decision]);

  return released;
}
