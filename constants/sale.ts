/**
 * Date flags for the limited-time sale banners on the paywall (Christmas:
 * issue #198, Black Friday).
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
 *
 * To add a sale: add an entry to `SALES` and its title string
 * `paywall.<titleKey>` in every locale. The body (`paywall.sale_body`) is
 * shared. Windows should not overlap; if they do, the first match wins.
 */
export type SalePlatform = 'ios' | 'android';

export interface SaleWindow {
  startsAt: string;
  endsAt: string;
}

export interface Sale {
  id: 'black_friday' | 'christmas';
  /** Key under `paywall.` for the banner title. */
  titleKey: string;
  windows: Record<SalePlatform, SaleWindow>;
}

export const BLACK_FRIDAY_SALE: Sale = {
  id: 'black_friday',
  titleKey: 'sale_black_friday_title',
  windows: {
    // Black Friday week through Cyber Monday (Nov 30), i.e. the end of November.
    // Must match the scheduled discount in Google Play Console.
    android: {
      startsAt: '2026-11-20T00:00:00Z',
      endsAt: '2026-12-01T00:00:00Z',
    },
    // TODO: confirm against the per-region times in App Store Connect.
    ios: {
      startsAt: '2026-11-20T00:00:00Z',
      endsAt: '2026-12-01T00:00:00Z',
    },
  },
};

export const CHRISTMAS_SALE: Sale = {
  id: 'christmas',
  titleKey: 'sale_christmas_title',
  windows: {
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
  },
};

export const SALES: readonly Sale[] = [BLACK_FRIDAY_SALE, CHRISTMAS_SALE];
