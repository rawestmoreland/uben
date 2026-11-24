/**
 * Pure rules for applying an over-the-air (EAS) update on the launch that
 * finds it, instead of on the next cold start.
 *
 * By default expo-updates starts the bundle already on the device (on a fresh
 * install, the one embedded in the store binary) and downloads a newer update
 * in the background, so a new update only runs on the *second* cold start
 * after it was published. `hooks/use-launch-update.ts` keeps the splash screen
 * up while that launch download is running and reloads into the update as
 * soon as it is on the device. No I/O here; the hook feeds in the expo-updates
 * state (`Updates.useUpdates()`).
 */

/**
 * How long, from launch, to wait for expo-updates to answer whether there is a
 * newer update. The splash animation takes about this long anyway, so a
 * normal check never delays the app; it only stops a hanging request (weak
 * signal, captive portal) from holding the splash.
 */
export const LAUNCH_UPDATE_CHECK_TIMEOUT_MS = 5_000;

/**
 * How long, from launch, to wait for a newer update to finish downloading.
 * After that the app opens on the current bundle and the update runs on the
 * next cold start (the old behaviour), so a slow network can't keep the user
 * on the splash screen.
 */
export const LAUNCH_UPDATE_DOWNLOAD_TIMEOUT_MS = 10_000;

/**
 * `Updates.reloadAsync()` resolves just before the restart. If the app is
 * still running this long afterwards, the restart didn't happen: open the app
 * rather than hold the splash forever.
 */
export const LAUNCH_UPDATE_RELOAD_GRACE_MS = 5_000;

export interface LaunchUpdateState {
  /** OTA updates can run in this build (store/preview build on a device). */
  enabled: boolean;
  /** expo-updates' launch check (and download, if any) is still running. */
  isStartupProcedureRunning: boolean;
  /** The launch check found a newer update (or a rollback). */
  isUpdateAvailable: boolean;
  isDownloading: boolean;
  /** A newer update (or rollback) is on the device but not running yet. */
  isUpdatePending: boolean;
  /**
   * Reloading won't interrupt startup writes (the database has finished
   * initializing, successfully or not).
   */
  canReload: boolean;
  checkTimedOut: boolean;
  downloadTimedOut: boolean;
  /**
   * `Updates.reloadAsync()` was rejected, or the restart didn't happen within
   * `LAUNCH_UPDATE_RELOAD_GRACE_MS`.
   */
  reloadFailed: boolean;
}

/**
 * - `wait`: keep the splash screen up
 * - `reload`: restart into the downloaded update now
 * - `continue`: open the app on the current bundle
 */
export type LaunchUpdateDecision = 'wait' | 'reload' | 'continue';

/**
 * What the launch should do about OTA updates right now. The caller must stop
 * asking once this returns `continue` (the splash is gone by then, and the app
 * must never restart under the user); a late download then runs on the next
 * cold start.
 */
export function decideLaunchUpdate(
  state: LaunchUpdateState,
): LaunchUpdateDecision {
  if (!state.enabled || state.reloadFailed) return 'continue';
  // Ahead of the timeouts: once the reload has been asked for, the deadline
  // passing mid-restart must not flash the old app.
  if (state.isUpdatePending && state.canReload) return 'reload';
  if (state.downloadTimedOut) return 'continue';
  // Downloaded, but the database is still initializing.
  if (state.isUpdatePending) return 'wait';
  // The launch check finished with nothing to apply (up to date, offline,
  // or the download failed).
  if (!state.isStartupProcedureRunning) return 'continue';
  if (state.isUpdateAvailable || state.isDownloading) return 'wait';
  return state.checkTimedOut ? 'continue' : 'wait';
}
