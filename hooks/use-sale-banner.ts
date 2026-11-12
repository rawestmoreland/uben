import { getActiveSale } from '@/services/saleService';
import { purchaseService } from '@/services/purchaseService';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface SaleBanner {
  /** Store-formatted sale price, e.g. "$4.99". */
  price: string;
  endsAt: Date;
}

/**
 * The sale to announce on the paywall, or null. Shown only inside the
 * platform's sale window (see `constants/sale.ts`) and once the live store
 * price has loaded, so the banner never advertises a price the store won't
 * charge. Offline there is nothing to buy, so it stays hidden.
 */
export function useSaleBanner(): SaleBanner | null {
  const [sale] = useState(() => getActiveSale(Platform.OS));
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    if (!sale) return;
    let cancelled = false;
    purchaseService.getLifetimePriceString().then((priceString) => {
      if (!cancelled) setPrice(priceString);
    });
    return () => {
      cancelled = true;
    };
  }, [sale]);

  if (!sale || !price) return null;
  return { price, endsAt: sale.endsAt };
}
