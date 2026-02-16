/**
 * PocketBase configuration for remote vocabulary sync.
 *
 * Set PB_URL and PB_API_KEY when your PocketBase instance is ready.
 * Leave PB_URL empty to disable sync entirely (the app works fully offline).
 *
 * The API key is passed as a query parameter and checked via a PocketBase
 * collection rule:  @request.query.key = "your-secret"
 */
export const PB_URL = process.env.EXPO_PUBLIC_PB_URL || 'http://localhost:8080';
export const PB_API_KEY = process.env.EXPO_PUBLIC_PB_API_KEY;

export const SYNC_CONFIG = {
  /** Max records per page when fetching from PocketBase */
  PAGE_SIZE: 200,
  /** Settings key for tracking last successful sync timestamp */
  LAST_SYNC_KEY: 'last_pocketbase_sync',
} as const;

/**
 * Format an ISO 8601 timestamp for use in PocketBase filter queries.
 *
 * PocketBase expects timestamps with a space separator instead of 'T':
 * - ✅ '2026-02-16 16:45:04.164Z'
 * - ❌ '2026-02-16T16:45:04.164Z'
 *
 * @param isoTimestamp - ISO 8601 formatted timestamp (e.g., from Date.toISOString())
 * @returns PocketBase-compatible timestamp string
 *
 * @example
 * const lastSync = new Date().toISOString(); // '2026-02-16T16:45:04.164Z'
 * const filter = `updated > '${formatPocketBaseTimestamp(lastSync)}'`; // "updated > '2026-02-16 16:45:04.164Z'"
 */
export function formatPocketBaseTimestamp(isoTimestamp: string): string {
  return isoTimestamp.replace('T', ' ');
}
