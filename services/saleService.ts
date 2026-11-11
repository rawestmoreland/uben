import {
  CHRISTMAS_SALE_WINDOWS,
  type SalePlatform,
  type SaleWindow,
} from '@/constants/sale';

export interface ActiveSale {
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
 * running (before it starts, after it ends, or on web).
 */
export function getActiveSale(
  platform: string,
  now: Date = new Date(),
): ActiveSale | null {
  if (platform !== 'ios' && platform !== 'android') return null;
  const window = CHRISTMAS_SALE_WINDOWS[platform as SalePlatform];
  if (!isWithinSaleWindow(window, now)) return null;
  return { endsAt: new Date(window.endsAt) };
}
