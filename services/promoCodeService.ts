import { PB_API_KEY, PB_URL } from '@/constants/pocketbase';
import { settingsService } from './settingsService';

export type PromoFailureReason =
  | 'invalid'
  | 'expired'
  | 'exhausted'
  | 'offline'
  | 'not_configured';

export interface PromoRedeemResult {
  success: boolean;
  reason?: PromoFailureReason;
}

/** Trim and uppercase, matching how codes are stored in PocketBase. */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Redeem a promo code against PocketBase. On success, Pro is unlocked
 * locally (stored under its own settings key so RevenueCat syncs can't wipe
 * it) and keeps working offline. Requires a network connection to redeem.
 * Never throws.
 */
export async function redeemCode(code: string): Promise<PromoRedeemResult> {
  if (!PB_URL || !PB_API_KEY) {
    return { success: false, reason: 'not_configured' };
  }

  const normalized = normalizePromoCode(code);
  if (!normalized) {
    return { success: false, reason: 'invalid' };
  }

  let response: Response;
  try {
    response = await fetch(
      `${PB_URL}/api/promo/redeem?key=${encodeURIComponent(PB_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      },
    );
  } catch {
    return { success: false, reason: 'offline' };
  }

  if (response.ok) {
    try {
      await settingsService.setPromoUnlocked(true);
      await settingsService.setPromoCodeUsed(normalized);
    } catch (error) {
      console.error('[Promo] Failed to store promo unlock:', error);
      return { success: false, reason: 'offline' };
    }
    return { success: true };
  }

  if (response.status === 410) return { success: false, reason: 'expired' };
  if (response.status === 409) return { success: false, reason: 'exhausted' };
  // 404 (unknown/inactive) and anything unexpected (403, 429, 5xx): treat
  // 5xx/429 as a connectivity-style failure so the user retries, the rest
  // as an invalid code.
  if (response.status === 429 || response.status >= 500) {
    return { success: false, reason: 'offline' };
  }
  return { success: false, reason: 'invalid' };
}
