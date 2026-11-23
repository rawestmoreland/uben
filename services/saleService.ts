import {
  SALES,
  type Sale,
  type SalePlatform,
  type SaleWindow,
} from '@/constants/sale';

export interface ActiveSale {
  id: Sale['id'];
  /** Key under `paywall.` for the banner title. */
  titleKey: string;
  /** When the sale (and so the banner) ends. */
  endsAt: Date;
}

/** Whether `now` falls inside the window. Start is inclusive, end exclusive. */
export function isWithinSaleWindow(window: SaleWindow, now: Date): boolean {
  const start = Date.parse(window.startsAt);
  const end = Date.parse(window.endsAt);
  // A malformed date should hide the banner, never show it forever.
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const time = now.getTime();
  return time >= start && time < end;
}

/**
 * The sale to announce right now on this platform, or null when no sale is
 * running (before it starts, after it ends, or on web). If windows overlap,
 * the first sale in `SALES` wins.
 */
export function getActiveSale(
  platform: string,
  now: Date = new Date(),
  sales: readonly Sale[] = SALES,
): ActiveSale | null {
  if (platform !== 'ios' && platform !== 'android') return null;
  for (const sale of sales) {
    const window = sale.windows[platform as SalePlatform];
    if (isWithinSaleWindow(window, now)) {
      return {
        id: sale.id,
        titleKey: sale.titleKey,
        endsAt: new Date(window.endsAt),
      };
    }
  }
  return null;
}
