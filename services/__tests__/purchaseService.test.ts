/**
 * purchaseService.test.ts
 *
 * Covers:
 * - The one-time grandfather migration (Üben Pro bundle, issue #69): users
 *   who already had B1+ selected, or already had more than the new free
 *   word cap, before the Pro bundle shipped must keep that access.
 * - The RevenueCat call sites (issue #70): isProUnlocked, purchasePro, and
 *   restorePurchases, mocking `react-native-purchases` at the SDK boundary.
 *
 * Mock objects are defined INSIDE their factory functions, not as external
 * variables, because jest.mock() factories run when the mocked module is
 * first required — before any module-level variable declarations below the
 * import have executed. References to the mock internals are obtained via
 * jest.requireMock() after the factories have already run.
 */

import type { CustomerInfo } from 'react-native-purchases';
import {
  LIFETIME_PRO_PRODUCT_ID,
  PRO_ENTITLEMENT_ID,
  PRO_FREE_WORD_LIMIT,
  purchaseService,
} from '../purchaseService';

jest.mock('@/database/db', () => {
  const db = { getFirstAsync: jest.fn() };
  return { getDatabase: () => db };
});

jest.mock('../settingsService', () => ({
  settingsService: {
    getProGrandfatherMigrationDone: jest.fn(),
    setProGrandfatherMigrationDone: jest.fn(),
    getSelectedLevels: jest.fn(),
    getGrandfatheredBLevel: jest.fn(),
    setGrandfatheredBLevel: jest.fn(),
    getGrandfatheredWordCap: jest.fn(),
    setGrandfatheredWordCap: jest.fn(),
    getProUnlocked: jest.fn(),
    setProUnlocked: jest.fn(),
    getAdjectiveDeclensionTrialQuestionsUsed: jest.fn(),
    setAdjectiveDeclensionTrialQuestionsUsed: jest.fn(),
  },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));

const mockDb = jest.requireMock('@/database/db').getDatabase();
const mockSettingsService = jest.requireMock('../settingsService').settingsService;
const mockPurchases = jest.requireMock('react-native-purchases').default;
const { PURCHASES_ERROR_CODE } = jest.requireMock('react-native-purchases');

function customerInfoWithEntitlement(active: boolean): CustomerInfo {
  return {
    entitlements: {
      active: active ? { [PRO_ENTITLEMENT_ID]: {} } : {},
      all: {},
      verification: 'NOT_REQUESTED',
    },
  } as unknown as CustomerInfo;
}

describe('purchaseService.runProGrandfatherMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsService.getProGrandfatherMigrationDone.mockResolvedValue(false);
    mockSettingsService.getSelectedLevels.mockResolvedValue(['A1']);
    mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
  });

  it('no-ops if the migration has already run', async () => {
    mockSettingsService.getProGrandfatherMigrationDone.mockResolvedValue(true);

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.getSelectedLevels).not.toHaveBeenCalled();
    expect(mockSettingsService.setGrandfatheredBLevel).not.toHaveBeenCalled();
  });

  it('grandfathers B-level access when the user already had B1+ selected', async () => {
    mockSettingsService.getSelectedLevels.mockResolvedValue(['A1', 'A2', 'B1+']);

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredBLevel).toHaveBeenCalledWith(true);
    expect(mockSettingsService.setProGrandfatherMigrationDone).toHaveBeenCalledWith(true);
  });

  it('does not grandfather B-level access when B1+ was never selected', async () => {
    mockSettingsService.getSelectedLevels.mockResolvedValue(['A1', 'A2']);

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredBLevel).not.toHaveBeenCalled();
  });

  it('grandfathers the word cap when the user already exceeded it', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: PRO_FREE_WORD_LIMIT + 1 });

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredWordCap).toHaveBeenCalledWith(true);
  });

  it('does not grandfather the word cap when the user is at or under the limit', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: PRO_FREE_WORD_LIMIT });

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredWordCap).not.toHaveBeenCalled();
  });
});

describe('purchaseService.isProUnlocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is true when RevenueCat reports the entitlement active, and caches it', async () => {
    mockPurchases.getCustomerInfo.mockResolvedValue(customerInfoWithEntitlement(true));

    await expect(purchaseService.isProUnlocked()).resolves.toBe(true);
    expect(mockSettingsService.setProUnlocked).toHaveBeenCalledWith(true);
  });

  it('is false when RevenueCat reports the entitlement inactive, and caches it', async () => {
    mockPurchases.getCustomerInfo.mockResolvedValue(customerInfoWithEntitlement(false));

    await expect(purchaseService.isProUnlocked()).resolves.toBe(false);
    expect(mockSettingsService.setProUnlocked).toHaveBeenCalledWith(false);
  });

  it('falls back to the cached entitlement when the RevenueCat call fails', async () => {
    mockPurchases.getCustomerInfo.mockRejectedValue(new Error('network error'));
    mockSettingsService.getProUnlocked.mockResolvedValue(true);

    await expect(purchaseService.isProUnlocked()).resolves.toBe(true);
    expect(mockSettingsService.setProUnlocked).not.toHaveBeenCalled();
  });
});

describe('purchaseService.purchasePro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function offeringsWithLifetimePackage() {
    const lifetimePackage = {
      identifier: '$rc_lifetime',
      product: { identifier: LIFETIME_PRO_PRODUCT_ID },
    };
    return {
      current: {
        lifetime: lifetimePackage,
        availablePackages: [lifetimePackage],
      },
      all: {},
    };
  }

  it('purchases the lifetime package and unlocks Pro on success', async () => {
    const offerings = offeringsWithLifetimePackage();
    mockPurchases.getOfferings.mockResolvedValue(offerings);
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: customerInfoWithEntitlement(true),
    });

    const result = await purchaseService.purchasePro();

    expect(mockPurchases.purchasePackage).toHaveBeenCalledWith(
      offerings.current.lifetime,
    );
    expect(mockSettingsService.setProUnlocked).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true });
  });

  it('errors without purchasing when no lifetime package is available', async () => {
    mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });

    const result = await purchaseService.purchasePro();

    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns cancelled without an error message when the user cancels', async () => {
    mockPurchases.getOfferings.mockResolvedValue(offeringsWithLifetimePackage());
    mockPurchases.purchasePackage.mockRejectedValue({
      code: PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
    });

    const result = await purchaseService.purchasePro();

    expect(result).toEqual({ success: false, cancelled: true });
    expect(mockSettingsService.setProUnlocked).not.toHaveBeenCalled();
  });

  it('returns a generic error on an unexpected purchase failure', async () => {
    mockPurchases.getOfferings.mockResolvedValue(offeringsWithLifetimePackage());
    mockPurchases.purchasePackage.mockRejectedValue(new Error('store problem'));

    const result = await purchaseService.purchasePro();

    expect(result.success).toBe(false);
    expect(result.cancelled).toBeFalsy();
    expect(result.error).toBeTruthy();
  });

  it('errors if the purchase completes but the entitlement is not active', async () => {
    mockPurchases.getOfferings.mockResolvedValue(offeringsWithLifetimePackage());
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: customerInfoWithEntitlement(false),
    });

    const result = await purchaseService.purchasePro();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('purchaseService.restorePurchases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unlocks Pro when a previous purchase is restored', async () => {
    mockPurchases.restorePurchases.mockResolvedValue(customerInfoWithEntitlement(true));

    const result = await purchaseService.restorePurchases();

    expect(mockSettingsService.setProUnlocked).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true });
  });

  it('reports no purchase found when the entitlement is not active', async () => {
    mockPurchases.restorePurchases.mockResolvedValue(customerInfoWithEntitlement(false));

    const result = await purchaseService.restorePurchases();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns a generic error when the restore call fails', async () => {
    mockPurchases.restorePurchases.mockRejectedValue(new Error('network error'));

    const result = await purchaseService.restorePurchases();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
