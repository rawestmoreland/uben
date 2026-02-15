/**
 * PocketBase configuration for remote vocabulary sync.
 *
 * Set PB_URL and PB_API_KEY when your PocketBase instance is ready.
 * Leave PB_URL empty to disable sync entirely (the app works fully offline).
 *
 * The API key is passed as a query parameter and checked via a PocketBase
 * collection rule:  @request.query.key = "your-secret"
 */
export const PB_URL = '';
export const PB_API_KEY = '';

export const SYNC_CONFIG = {
  /** Max records per page when fetching from PocketBase */
  PAGE_SIZE: 200,
  /** Settings key for tracking last successful sync timestamp */
  LAST_SYNC_KEY: 'last_pocketbase_sync',
} as const;
