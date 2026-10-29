import {
  shiftReminderTime,
  DEFAULT_REMINDER_TIME,
  type ReminderTime,
} from '@/services/reminderPlanner';
import {
  notificationService,
  type ReminderPermission,
} from '@/services/notificationService';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * State and actions for the Reminders card in Settings.
 *
 * `enabled` is what the user sees: the saved preference AND notification
 * permission still being granted, so the switch is honest if they turned
 * notifications off in system settings. Permission is re-read whenever the
 * app returns to the foreground (e.g. back from system settings).
 */
export function useReminders() {
  const [enabled, setEnabledState] = useState(false);
  const [time, setTimeState] = useState<ReminderTime>(DEFAULT_REMINDER_TIME);
  const [streakEnabled, setStreakEnabledState] = useState(false);
  const [permission, setPermission] =
    useState<ReminderPermission>('undetermined');
  // Nothing to load on web, where reminders aren't available.
  const [isLoading, setIsLoading] = useState(Platform.OS !== 'web');

  const refresh = useCallback(async () => {
    try {
      const [settings, currentPermission] = await Promise.all([
        notificationService.getSettings(),
        notificationService.getPermission(),
      ]);
      setEnabledState(settings.enabled && currentPermission === 'granted');
      setTimeState(settings.time);
      setStreakEnabledState(settings.streakEnabled);
      setPermission(currentPermission);
    } catch (error) {
      console.error('[Reminders] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Deferred so the initial load isn't a synchronous setState in the effect body.
    const initialLoad = setTimeout(refresh, 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(initialLoad);
      subscription.remove();
    };
  }, [refresh]);

  const setEnabled = useCallback(
    async (next: boolean) => {
      try {
        if (next) {
          await notificationService.enableReminders();
        } else {
          await notificationService.disableReminders();
        }
      } catch (error) {
        console.error('[Reminders] Failed to update reminders:', error);
      }
      await refresh();
    },
    [refresh],
  );

  const shiftTime = useCallback(
    async (hours: number) => {
      const next = shiftReminderTime(time, hours);
      setTimeState(next);
      try {
        await notificationService.setReminderTime(next);
      } catch (error) {
        console.error('[Reminders] Failed to save reminder time:', error);
        setTimeState(time);
      }
    },
    [time],
  );

  const setStreakEnabled = useCallback(async (next: boolean) => {
    setStreakEnabledState(next);
    try {
      await notificationService.setStreakRemindersEnabled(next);
    } catch (error) {
      console.error('[Reminders] Failed to save streak reminder:', error);
      setStreakEnabledState(!next);
    }
  }, []);

  const openSystemSettings = useCallback(() => {
    notificationService.openSystemSettings().catch((error) => {
      console.warn('[Reminders] Failed to open system settings:', error);
    });
  }, []);

  return {
    enabled,
    time,
    streakEnabled,
    permission,
    isLoading,
    setEnabled,
    shiftTime,
    setStreakEnabled,
    openSystemSettings,
  };
}
