import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Product } from 'expo-iap';

interface EntitlementContextValue {
  isPro: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  proProduct: Product | null;
  purchasePro: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(
  null,
);

const NOT_SUPPORTED = { success: false, error: 'Not available on web' };

/** In-app purchases aren't supported on web; everyone is treated as free-tier. */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const value = useMemo<EntitlementContextValue>(
    () => ({
      isPro: false,
      isLoading: false,
      isPurchasing: false,
      proProduct: null,
      purchasePro: async () => NOT_SUPPORTED,
      restorePurchases: async () => NOT_SUPPORTED,
    }),
    [],
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
