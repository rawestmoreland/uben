import {
  notificationService,
  REMINDER_TARGET_ROUTE,
} from '@/services/notificationService';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * App-wide glue for practice reminders. Mount once in the root layout.
 *
 * - Re-plans the pending reminders whenever the app opens or goes to the
 *   background. Opening resets the back-off for users who were ignoring
 *   reminders, and backgrounding picks up whatever they just practiced.
 * - Opens the practice session when a reminder is tapped.
 *
 * `ready` should be true once the database is initialized and the navigator
 * is mounted; nothing happens before then.
 */
export function useReminderScheduler(ready: boolean) {
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;

    notificationService.rescheduleReminders();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') {
        notificationService.rescheduleReminders();
      }
    });
    return () => subscription.remove();
  }, [ready]);

  useEffect(() => {
    if (!ready || !lastResponse) return;

    // The hook keeps returning the last response; act on each one only once.
    const responseId = lastResponse.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    handledResponseId.current = responseId;

    if (
      lastResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER &&
      lastResponse.notification.request.content.data?.url ===
        REMINDER_TARGET_ROUTE
    ) {
      router.push(REMINDER_TARGET_ROUTE);
    }
  }, [ready, lastResponse]);
}
