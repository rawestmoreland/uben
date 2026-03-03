import { SETTINGS_KEYS, settingsService } from '@/services/settingsService';
import * as StoreReview from 'expo-store-review';
import { useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────

/**
 * Number of completed quiz sessions required before we first ask for a review.
 * 5 sessions is enough to confirm the user is active and engaged.
 */
const QUIZ_SESSIONS_THRESHOLD = 5;

/**
 * Minimum days between review requests. Avoids re-prompting frequent users
 * too often after they've already seen the dialog.
 */
const MIN_DAYS_BETWEEN_REQUESTS = 90;

// ── Hook ──────────────────────────────────────────────────────────────

/**
 * Tracks completed quiz sessions and requests an App Store / Play Store
 * review when the user has demonstrated they are active.
 *
 * Call `handleSessionComplete()` once every time a quiz session finishes.
 * The hook manages all threshold checks and will silently no-op if the
 * conditions haven't been met yet.
 */
export function useStoreReview() {
  const handleSessionComplete = useCallback(async () => {
    try {
      // Increment completed session count
      const countStr = await settingsService.getSetting(
        SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED,
      );
      const count = countStr ? parseInt(countStr, 10) : 0;
      const newCount = count + 1;

      await settingsService.setSetting(
        SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED,
        String(newCount),
      );

      // Haven't hit the threshold yet
      if (newCount < QUIZ_SESSIONS_THRESHOLD) return;

      // Check how long since we last asked
      const lastRequestStr = await settingsService.getSetting(
        SETTINGS_KEYS.LAST_REVIEW_REQUEST_DATE,
      );
      if (lastRequestStr) {
        const daysSince =
          (Date.now() - new Date(lastRequestStr).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSince < MIN_DAYS_BETWEEN_REQUESTS) return;
      }

      // Check if the platform supports the review dialog
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) return;

      // Request the review and record the timestamp so we don't ask again soon
      await StoreReview.requestReview();

      await settingsService.setSetting(
        SETTINGS_KEYS.LAST_REVIEW_REQUEST_DATE,
        new Date().toISOString(),
      );
    } catch (error) {
      // Review request failures must never crash the app
      console.warn('[StoreReview] Failed to request review:', error);
    }
  }, []);

  return { handleSessionComplete };
}
