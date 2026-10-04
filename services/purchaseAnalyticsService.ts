import { PB_API_KEY, PB_URL } from '@/constants/pocketbase';

/**
 * Steps in the Üben Pro purchase funnel, tracked so conversion can be
 * measured (paywall shown → purchase or restore attempted → succeeded /
 * cancelled / failed).
 */
export type PurchaseFunnelEvent =
  | 'paywall_viewed'
  | 'purchase_attempted'
  | 'purchase_succeeded'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'restore_attempted'
  | 'restore_succeeded'
  | 'restore_failed';

/**
 * Submits an anonymous purchase-funnel event to PocketBase.
 *
 * ## What is stored
 *   - `event`  — the funnel step (see `PurchaseFunnelEvent`)
 *   - `source` — which surface sent the user to the paywall (e.g.
 *     "adjective_quiz", "level_selector"), if known
 *   - `created`/`updated` — auto-generated timestamps (no user info)
 *
 * ## What is NOT stored
 *   No user ID, session ID, device ID, installation ID, or location.
 *   The raw records are admin-only; only aggregate reports are ever shared.
 *
 * ## Behaviour
 *   Fire-and-forget — errors are silently ignored so a failed submission
 *   never interrupts the purchase flow. Skipped automatically when
 *   PocketBase isn't configured (offline-only mode).
 */
export function trackPurchaseFunnelEvent(
  event: PurchaseFunnelEvent,
  source?: string | null,
): void {
  if (!PB_URL || !PB_API_KEY || __DEV__) return;

  fetch(`${PB_URL}/api/collections/purchase_events/records?key=${PB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, source: source || undefined }),
  }).catch(() => {
    // Analytics submissions are best-effort — never surface errors to the user.
  });
}
