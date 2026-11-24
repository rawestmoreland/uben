/**
 * Describes the OTA (EAS) update the app is currently running, for the
 * version line on the Settings screen. Pure so it can be unit tested; the
 * hook in `hooks/use-ota-update-info.ts` feeds it expo-updates' values.
 */

export interface OtaUpdateSource {
  /** expo-updates is active in this build (false on web, in dev, when disabled). */
  isEnabled: boolean;
  /** The running bundle is the one embedded in the store binary, not an OTA. */
  isEmbeddedLaunch: boolean;
  updateId: string | null | undefined;
  createdAt: Date | null | undefined;
}

export interface OtaUpdateInfo {
  /** First 8 characters of the update's UUID. */
  shortId: string;
  /** Local calendar date the update was published, `YYYY-MM-DD`, or null. */
  publishedOn: string | null;
}

const SHORT_ID_LENGTH = 8;

/** Local `YYYY-MM-DD`; never `toISOString()`, which is UTC (see utils/streak.ts). */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns info about the running OTA update, or null when the app runs the
 * bundle shipped in the store build (nothing OTA-specific to show).
 */
export function getOtaUpdateInfo(source: OtaUpdateSource): OtaUpdateInfo | null {
  if (!source.isEnabled || source.isEmbeddedLaunch || !source.updateId) {
    return null;
  }

  const createdAt =
    source.createdAt && !Number.isNaN(source.createdAt.getTime())
      ? source.createdAt
      : null;

  return {
    shortId: source.updateId.slice(0, SHORT_ID_LENGTH),
    publishedOn: createdAt ? formatLocalDate(createdAt) : null,
  };
}

/** `OTA 3f2a9c1b · 2026-11-20` (the date is left out when unknown). */
export function formatOtaUpdateInfo(info: OtaUpdateInfo): string {
  return info.publishedOn
    ? `OTA ${info.shortId} · ${info.publishedOn}`
    : `OTA ${info.shortId}`;
}
