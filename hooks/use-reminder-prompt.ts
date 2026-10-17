import { notificationService } from '@/services/notificationService';
import { SETTINGS_KEYS, settingsService } from '@/services/settingsService';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';

// ── Constants ─────────────────────────────────────────────────────────

/** Lets the results screen render before anything is layered on top of it. */
const PROMPT_DELAY_MS = 2000;

/**
 * If the store-review dialog was just requested, hold the reminder prompt back
 * until a later session rather than stacking two dialogs on the user.
 */
const REVIEW_REQUEST_COOLDOWN_MS = 5 * 60 * 1000;

// ── Hook ──────────────────────────────────────────────────────────────

/**
 * Call once from a quiz results screen (it runs on mount).
 *
 * 1. Refreshes the pending reminders, since the user just practiced and
 *    today's reminder is no longer needed.
 * 2. Asks, once ever, whether they'd like practice reminders. Asking right
 *    after a finished session means the value is obvious, and the system
 *    permission prompt only appears if they say yes.
 */
export function useReminderPrompt() {
  const { t } = useTranslation('app');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const showPrompt = async () => {
      if (cancelled) return;

      const lastReviewRequest = await settingsService.getSetting(
        SETTINGS_KEYS.LAST_REVIEW_REQUEST_DATE,
      );
      if (
        lastReviewRequest &&
        Date.now() - new Date(lastReviewRequest).getTime() <
          REVIEW_REQUEST_COOLDOWN_MS
      ) {
        return;
      }

      // Mark as seen before showing, so the prompt can never repeat.
      await settingsService.setReminderPromptSeen(true);
      Alert.alert(t('reminders.prompt_title'), t('reminders.prompt_body'), [
        { text: t('reminders.prompt_not_now'), style: 'cancel' },
        {
          text: t('reminders.prompt_accept'),
          onPress: () => {
            notificationService.enableReminders().catch((error) => {
              console.warn('[Reminders] Failed to enable reminders:', error);
            });
          },
        },
      ]);
    };

    (async () => {
      try {
        await notificationService.rescheduleReminders();

        const [seen, enabled] = await Promise.all([
          settingsService.getReminderPromptSeen(),
          settingsService.getRemindersEnabled(),
        ]);
        if (seen || enabled || cancelled) return;

        timer = setTimeout(() => {
          showPrompt().catch((error) => {
            console.warn('[Reminders] Failed to show prompt:', error);
          });
        }, PROMPT_DELAY_MS);
      } catch (error) {
        // The prompt is an extra; it must never disturb the results screen.
        console.warn('[Reminders] Failed to prepare prompt:', error);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
