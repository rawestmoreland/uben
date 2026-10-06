/**
 * promoCodeService.test.ts
 *
 * Covers redeemCode with `fetch` mocked: success sets the local flag, each
 * failure reason leaves it unset, offline / not-configured cases, and input
 * normalization.
 */

import { redeemCode } from '../promoCodeService';

jest.mock('@/constants/pocketbase', () => ({
  PB_URL: 'https://pb.test',
  PB_API_KEY: 'test-key',
}));

jest.mock('../settingsService', () => ({
  settingsService: {
    setPromoUnlocked: jest.fn(),
    setPromoCodeUsed: jest.fn(),
  },
}));

const mockSettingsService = jest.requireMock('../settingsService').settingsService;
const mockFetch = jest.fn();

function respondWith(status: number) {
  mockFetch.mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = mockFetch;
});

describe('promoCodeService.redeemCode', () => {
  it('sets the promo flag and stores the code on success', async () => {
    respondWith(200);

    await expect(redeemCode('abc123')).resolves.toEqual({ success: true });
    expect(mockSettingsService.setPromoUnlocked).toHaveBeenCalledWith(true);
    expect(mockSettingsService.setPromoCodeUsed).toHaveBeenCalledWith('ABC123');
  });

  it('trims and uppercases the code before sending', async () => {
    respondWith(200);

    await redeemCode('  abc123 ');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://pb.test/api/promo/redeem?key=test-key',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'ABC123' }),
      }),
    );
  });

  it.each([
    [404, 'invalid'],
    [410, 'expired'],
    [409, 'exhausted'],
  ])('maps HTTP %i to "%s" and leaves the flag unset', async (status, reason) => {
    respondWith(status);

    await expect(redeemCode('ABC123')).resolves.toEqual({ success: false, reason });
    expect(mockSettingsService.setPromoUnlocked).not.toHaveBeenCalled();
  });

  it('maps network errors to "offline" without throwing', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    await expect(redeemCode('ABC123')).resolves.toEqual({
      success: false,
      reason: 'offline',
    });
    expect(mockSettingsService.setPromoUnlocked).not.toHaveBeenCalled();
  });

  it('rejects an empty code as invalid without a network call', async () => {
    await expect(redeemCode('   ')).resolves.toEqual({
      success: false,
      reason: 'invalid',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('promoCodeService.redeemCode (not configured)', () => {
  it('returns not_configured when PB_API_KEY is missing', async () => {
    jest.resetModules();
    jest.doMock('@/constants/pocketbase', () => ({
      PB_URL: 'https://pb.test',
      PB_API_KEY: undefined,
    }));
    const { redeemCode: redeemUnconfigured } = require('../promoCodeService');

    await expect(redeemUnconfigured('ABC123')).resolves.toEqual({
      success: false,
      reason: 'not_configured',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
