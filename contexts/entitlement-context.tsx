import { IAP_PRODUCT_IDS } from '@/constants/iap';
import { settingsService } from '@/services/settingsService';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useIAP, type Product, type Purchase } from 'expo-iap';

const PRO_SKU = Platform.select({
  ios: IAP_PRODUCT_IDS.pro.ios,
  android: IAP_PRODUCT_IDS.pro.android,
  default: IAP_PRODUCT_IDS.pro.ios,
});

function isProPurchase(purchase: Purchase): boolean {
  return purchase.productId === PRO_SKU;
}

interface EntitlementContextValue {
  /** Whether the user has purchased the Pro unlock (ad-free + unlimited words). */
  isPro: boolean;
  /** True until the cached entitlement has been read from local storage. */
  isLoading: boolean;
  /** True while a purchase is in flight. */
  isPurchasing: boolean;
  /** The Pro product's store listing (price, title), once fetched. Null until loaded. */
  proProduct: Product | null;
  purchasePro: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(
  null,
);

/**
 * Provides Pro entitlement state app-wide, backed by a local settings flag
 * (for instant, offline reads) and reconciled against the store's own
 * purchase record once connected (covers reinstalls and new devices).
 *
 * No server-side receipt validation — this is a single non-consumable
 * purchase with no recurring billing state to protect, so the store SDK's
 * own record is trusted directly.
 */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsProState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const grantPro = useCallback(async () => {
    setIsProState(true);
    try {
      await settingsService.setIsPro(true);
    } catch (error) {
      console.warn('[Entitlement] Failed to persist Pro flag:', error);
    }
  }, []);

  const {
    connected,
    products,
    availablePurchases,
    getAvailablePurchases,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases: iapRestorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (!isProPurchase(purchase)) return;
      try {
        if (purchase.purchaseState !== 'pending') {
          await grantPro();
        }
        await finishTransaction({ purchase, isConsumable: false });
      } catch (error) {
        console.warn('[Entitlement] Failed to finish transaction:', error);
      } finally {
        setIsPurchasing(false);
      }
    },
    onPurchaseError: (error) => {
      console.warn('[Entitlement] Purchase error:', error);
      setIsPurchasing(false);
    },
  });

  // Read the cached flag immediately so ad-gating and word limits react
  // instantly, without waiting on the store connection round-trip.
  useEffect(() => {
    settingsService
      .getIsPro()
      .then(setIsProState)
      .catch((error) => {
        console.warn('[Entitlement] Failed to load cached Pro flag:', error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Once connected, fetch the Pro product listing and the user's purchase
  // history so a reinstall or new device recovers entitlement automatically.
  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [PRO_SKU], type: 'in-app' }).catch((error) => {
      console.warn('[Entitlement] Failed to fetch products:', error);
    });
    getAvailablePurchases().catch((error) => {
      console.warn('[Entitlement] Failed to fetch available purchases:', error);
    });
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    if (availablePurchases.some(isProPurchase)) {
      grantPro();
    }
  }, [availablePurchases, grantPro]);

  const proProduct = useMemo(
    () => products.find((product) => product.id === PRO_SKU) ?? null,
    [products],
  );

  const purchasePro = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    setIsPurchasing(true);
    try {
      await requestPurchase({
        request: {
          apple: { sku: IAP_PRODUCT_IDS.pro.ios },
          google: { skus: [IAP_PRODUCT_IDS.pro.android] },
        },
        type: 'in-app',
      });
      // Entitlement is granted from onPurchaseSuccess above; isPurchasing is
      // cleared there too. Nothing further to do on the happy path.
      return { success: true };
    } catch (error) {
      setIsPurchasing(false);
      const message = error instanceof Error ? error.message : 'Purchase failed';
      return { success: false, error: message };
    }
  }, [requestPurchase]);

  const restorePurchases = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      await iapRestorePurchases();
      await getAvailablePurchases();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Restore failed';
      return { success: false, error: message };
    }
  }, [iapRestorePurchases, getAvailablePurchases]);

  const value = useMemo<EntitlementContextValue>(
    () => ({
      isPro,
      isLoading,
      isPurchasing,
      proProduct,
      purchasePro,
      restorePurchases,
    }),
    [isPro, isLoading, isPurchasing, proProduct, purchasePro, restorePurchases],
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement(): EntitlementContextValue {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error('useEntitlement must be used within an EntitlementProvider');
  }
  return context;
}
