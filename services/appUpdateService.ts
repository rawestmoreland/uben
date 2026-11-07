import { PB_API_KEY, PB_URL } from '@/constants/pocketbase';
import {
  evaluateUpdate,
  type AppConfigRecord,
  type AppPlatform,
  type AppUpdateInfo,
} from '@/services/appVersion';
import { SETTINGS_KEYS, settingsService } from '@/services/settingsService';

// ── Constants ─────────────────────────────────────────────────────────

/** Re-fetch `app_config` at most this often; in between the cache is used. */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Don't let a dead server hold up anything awaiting the check. */
const FETCH_TIMEOUT_MS = 8000;

interface CachedConfig {
  /** Epoch ms of the last successful fetch. */
  checkedAt: number;
  /** `null` means PocketBase has no row for this platform. */
  config: AppConfigRecord | null;
}

// ── Service ───────────────────────────────────────────────────────────

/**
 * Optional "your app is behind the store" check, backed by the PocketBase
 * `app_config` collection (one row per platform).
 *
 * - Never throws: offline, unconfigured, a missing row or bad data all
 *   resolve to `null` ("nothing to tell the user").
 * - The last good row is cached in `settings`, so a mandatory update is still
 *   enforced when the device is offline, and PocketBase is hit once a day.
 * - Display only. This does not touch vocabulary sync or user progress.
 */
class AppUpdateService {
  /**
   * Resolve what (if anything) to show for the installed binary version.
   * Pass the native version, not the OTA manifest's: an OTA can carry a newer
   * `version` than the binary the user actually has installed.
   */
  async check(
    platform: AppPlatform,
    installedVersion: string,
  ): Promise<AppUpdateInfo | null> {
    try {
      const cached = await this.readCache();
      let config = cached?.config ?? null;

      const isFresh = cached && Date.now() - cached.checkedAt < CHECK_INTERVAL_MS;
      if (!isFresh) {
        const fetched = await this.fetchConfig(platform);
        // A failed fetch keeps the stale cache; the next foreground retries.
        if (fetched !== undefined) {
          config = fetched;
          await this.writeCache({ checkedAt: Date.now(), config });
        }
      }

      const dismissedVersion = await settingsService.getSetting(
        SETTINGS_KEYS.APP_UPDATE_DISMISSED_VERSION,
      );
      return evaluateUpdate({ installedVersion, config, dismissedVersion });
    } catch (error) {
      console.warn('[AppUpdate] Check failed:', error);
      return null;
    }
  }

  /** Hide the banner until a newer `latest_version` is published. */
  async dismiss(latestVersion: string): Promise<void> {
    try {
      await settingsService.setSetting(
        SETTINGS_KEYS.APP_UPDATE_DISMISSED_VERSION,
        latestVersion,
      );
    } catch (error) {
      console.warn('[AppUpdate] Failed to save dismissal:', error);
    }
  }

  // ── Fetching ────────────────────────────────────────────────────

  /**
   * Fetch this platform's row. Resolves to the record, `null` when PocketBase
   * has no row, or `undefined` when the lookup couldn't be completed.
   */
  private async fetchConfig(
    platform: AppPlatform,
  ): Promise<AppConfigRecord | null | undefined> {
    if (!PB_URL) return undefined;

    const params = new URLSearchParams({
      filter: `(platform='${platform}')`,
      perPage: '1',
    });
    // The collection is public-read; the key is only sent when configured.
    if (PB_API_KEY) params.set('key', PB_API_KEY);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${PB_URL}/api/collections/app_config/records?${params}`,
        { signal: controller.signal },
      );
      if (!response.ok) return undefined;

      const data: { items?: AppConfigRecord[] } = await response.json();
      return data.items?.[0] ?? null;
    } catch {
      // Offline / timeout / bad JSON: the app works fine without this check.
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Cache ───────────────────────────────────────────────────────

  private async readCache(): Promise<CachedConfig | null> {
    const raw = await settingsService.getSetting(SETTINGS_KEYS.APP_UPDATE_CACHE);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<CachedConfig>;
      if (typeof parsed.checkedAt !== 'number') return null;
      return { checkedAt: parsed.checkedAt, config: parsed.config ?? null };
    } catch {
      return null;
    }
  }

  private async writeCache(cache: CachedConfig): Promise<void> {
    await settingsService.setSetting(
      SETTINGS_KEYS.APP_UPDATE_CACHE,
      JSON.stringify(cache),
    );
  }
}

export const appUpdateService = new AppUpdateService();
