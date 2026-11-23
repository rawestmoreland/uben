/**
 * Pure rules for over-the-air (expo-updates) checks. No expo-updates import
 * here so the rules stay unit testable; `services/otaUpdateService.ts` owns
 * the native calls.
 */

/** Minimum time between two update checks, so resuming the app often is cheap. */
export const OTA_CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Routes where a reload can't lose anything: the bottom-tab screens.
 * An allowlist on purpose: a new quiz or form screen is unsafe by default
 * and can never be reloaded away by forgetting to register it here.
 */
const SAFE_RELOAD_PATHNAMES = new Set([
  '/',
  '/index',
  '/progress',
  '/reference',
  '/words',
  '/settings',
]);

/** True when enough time passed since the last check (or none happened yet). */
export function shouldCheckForUpdate(
  nowMs: number,
  lastCheckedAtMs: number | null,
  intervalMs: number = OTA_CHECK_INTERVAL_MS,
): boolean {
  if (lastCheckedAtMs === null) return true;
  // A clock that moved backwards must not block checks until it catches up.
  if (nowMs < lastCheckedAtMs) return true;
  return nowMs - lastCheckedAtMs >= intervalMs;
}

/** True when the app may restart now to apply a downloaded update. */
export function isSafeToReload(pathname: string): boolean {
  return SAFE_RELOAD_PATHNAMES.has(pathname);
}

export interface InstalledUpdate {
  /** UUID of the running update; null for the bundle embedded in the binary. */
  updateId: string | null;
  createdAt: Date | null;
  isEmbeddedLaunch: boolean;
}

/**
 * Short label for the Settings footer, e.g. `update a1b2c3d4 · 2026-11-20`,
 * or `embedded` when no OTA update has been applied.
 */
export function formatInstalledUpdate(info: InstalledUpdate): string {
  if (info.isEmbeddedLaunch || !info.updateId) return 'embedded';
  const shortId = info.updateId.slice(0, 8);
  if (!info.createdAt || Number.isNaN(info.createdAt.getTime())) {
    return `update ${shortId}`;
  }
  // UTC date so the label matches the EAS dashboard whatever the device zone.
  return `update ${shortId} · ${info.createdAt.toISOString().slice(0, 10)}`;
}
