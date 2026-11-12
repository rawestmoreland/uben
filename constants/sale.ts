/**
 * Date flags for the Christmas sale banner on the paywall (issue #198).
 *
 * The sale price itself is a scheduled price change in App Store Connect and
 * Play Console (same `lifetime_pro` product, no RevenueCat change). These
 * windows only decide when the paywall *announces* it, so the code can ship
 * over the air before the sale starts and stay hidden until then.
 *
 * Timestamps are ISO 8601 in UTC. `endsAt` is exclusive.
 *
 * Keep one entry per platform: Apple does not switch prices at one UTC
 * instant (start/end times depend on the region and the scheduled date; App
 * Store Connect shows them once a date is picked), so the iOS window may need
 * adjusting after checking the dates there. Being a few hours off is harmless
 * because the banner shows the live store price, but it should not outlive
 * the sale.
 */
export type SalePlatform = 'ios' | 'android';

export interface SaleWindow {
  startsAt: string;
  endsAt: string;
}

export const CHRISTMAS_SALE_WINDOWS: Record<SalePlatform, SaleWindow> = {
  // Google Play discount: Dec 18 12:00 UTC to Jan 3 12:00 UTC.
  android: {
    startsAt: '2026-12-18T12:00:00Z',
    endsAt: '2027-01-03T12:00:00Z',
  },
  // TODO(#198): confirm against the per-region times in App Store Connect.
  ios: {
    startsAt: '2026-12-18T12:00:00Z',
    endsAt: '2027-01-03T12:00:00Z',
  },
};
