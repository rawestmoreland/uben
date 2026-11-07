/**
 * Pure helpers for the "your app is behind the store" notice.
 *
 * No I/O here: `appUpdateService.ts` fetches the `app_config` row and reads
 * the cache, then hands everything to `evaluateUpdate`.
 */

// ── Types ─────────────────────────────────────────────────────────────

export type AppPlatform = 'ios' | 'android';

/** One row of the PocketBase `app_config` collection (one per platform). */
export interface AppConfigRecord {
  platform: AppPlatform;
  /** Newest version that is live in the store. */
  latest_version: string;
  /** Oldest version still allowed to run. Empty/absent means no forced update. */
  min_version?: string | null;
  store_url: string;
  /** Optional custom text shown instead of the default body. */
  message?: string | null;
}

export type AppUpdateStatus = 'available' | 'required';

export interface AppUpdateInfo {
  /** `required` blocks the app; `available` is a dismissible banner. */
  status: AppUpdateStatus;
  latestVersion: string;
  storeUrl: string;
  message: string | null;
}

type ParsedVersion = [major: number, minor: number, patch: number];

// ── Version parsing ───────────────────────────────────────────────────

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/** Parse a strict `x.y.z` version. Returns `null` for anything else. */
export function parseVersion(version: string | null | undefined): ParsedVersion | null {
  const match = VERSION_PATTERN.exec((version ?? '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Negative if `a < b`, positive if `a > b`, 0 if equal. */
function compareParsed(a: ParsedVersion, b: ParsedVersion): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Compare two `x.y.z` versions. Returns `null` when either one can't be
 * parsed, so callers can treat bad data as "don't know" rather than guessing.
 */
export function compareVersions(a: string, b: string): number | null {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);
  if (!parsedA || !parsedB) return null;
  return compareParsed(parsedA, parsedB);
}

// ── Decision ──────────────────────────────────────────────────────────

/** Only https store links are opened; PocketBase content is not trusted blindly. */
function isSafeStoreUrl(url: string): boolean {
  return /^https:\/\//i.test(url.trim());
}

interface EvaluateInput {
  /** The installed binary's version (not the OTA manifest's). */
  installedVersion: string;
  config: AppConfigRecord | null;
  /** The `latest_version` the user last dismissed the banner for, if any. */
  dismissedVersion: string | null;
}

/**
 * Decide what, if anything, to tell the user.
 *
 * - installed < `min_version`            -> `required` (blocking, can't dismiss)
 * - installed < `latest_version`         -> `available` (banner), unless the
 *   user already dismissed this exact `latest_version`
 * - otherwise, or on any unusable data   -> `null`
 *
 * A `min_version` above `latest_version` is a misconfiguration (it would force
 * users onto a build they can't download yet), so it is ignored.
 */
export function evaluateUpdate({
  installedVersion,
  config,
  dismissedVersion,
}: EvaluateInput): AppUpdateInfo | null {
  if (!config) return null;

  const installed = parseVersion(installedVersion);
  const latest = parseVersion(config.latest_version);
  if (!installed || !latest) return null;
  if (!config.store_url || !isSafeStoreUrl(config.store_url)) return null;

  const base = {
    latestVersion: config.latest_version,
    storeUrl: config.store_url.trim(),
    message: config.message?.trim() || null,
  };

  const min = parseVersion(config.min_version);
  if (min && compareParsed(min, latest) <= 0 && compareParsed(installed, min) < 0) {
    return { ...base, status: 'required' };
  }

  if (compareParsed(installed, latest) < 0 && dismissedVersion !== config.latest_version) {
    return { ...base, status: 'available' };
  }

  return null;
}
