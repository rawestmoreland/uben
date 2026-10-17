import i18n from '@/constants/i18n';
import {
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
  getReminderSlots,
  getTypicalPracticeTime,
  parseReminderTime,
  planReminders,
  toDateKey,
  type PlannedReminder,
  type ReminderTime,
} from '@/services/reminderPlanner';
import { settingsService } from '@/services/settingsService';
import { spacedRepetitionService } from '@/services/spacedRepetitionService';
import { statisticsService } from '@/services/statisticsService';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

// ── Constants ─────────────────────────────────────────────────────────

/** Android channel for practice reminders. Default (not high) importance: no heads-up popups. */
const REMINDER_CHANNEL_ID = 'practice-reminders';

/** Prefix for every notification this service schedules, so we only ever cancel our own. */
const REMINDER_ID_PREFIX = 'practice-reminder-';

/** Where tapping a reminder lands: the daily practice session. */
export const REMINDER_TARGET_ROUTE = '/quiz';

const COPY_VARIANT_KEYS = ['a', 'b', 'c'] as const;

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export interface ReminderSettings {
  enabled: boolean;
  time: ReminderTime;
  streakEnabled: boolean;
}

// ── Platform ──────────────────────────────────────────────────────────

/** Local notifications are native-only; web is a silent no-op. */
const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

// ── Permission ────────────────────────────────────────────────────────

async function getPermission(): Promise<ReminderPermission> {
  if (!isSupported) return 'denied';
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return 'granted';
  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: i18n.t('reminders.channel_name'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// ── Copy ──────────────────────────────────────────────────────────────

function buildContent(
  reminder: PlannedReminder,
  streak: number,
): Notifications.NotificationContentInput {
  const data = { url: REMINDER_TARGET_ROUTE };

  if (reminder.kind === 'streak') {
    return {
      title: i18n.t('reminders.streak_title'),
      body: i18n.t('reminders.streak_body', { streak }),
      data,
    };
  }

  return {
    title: i18n.t('reminders.due_title'),
    body: i18n.t('reminders.due_body', {
      count: reminder.dueCount,
      context: COPY_VARIANT_KEYS[reminder.variant % COPY_VARIANT_KEYS.length],
    }),
    data,
  };
}

// ── Scheduling ────────────────────────────────────────────────────────

async function cancelOwnReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(({ identifier }) => identifier.startsWith(REMINDER_ID_PREFIX))
      .map(({ identifier }) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
  );
}

async function scheduleReminders(settings: ReminderSettings): Promise<void> {
  const now = new Date();
  const [hasReviewedToday, streak] = await Promise.all([
    spacedRepetitionService.hasReviewedToday(),
    spacedRepetitionService.getStudyStreak(),
  ]);

  const slots = getReminderSlots(now, settings.time, hasReviewedToday);
  const dueByDate = await spacedRepetitionService.getCumulativeDueCounts(
    slots.map(toDateKey),
  );
  const reminders = planReminders(slots, {
    now,
    dueByDate,
    hasReviewedToday,
    streak,
    streakRemindersEnabled: settings.streakEnabled,
  });

  await ensureAndroidChannel();
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REMINDER_ID_PREFIX}${toDateKey(reminder.fireAt)}`,
      content: buildContent(reminder, streak),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

/**
 * Calls are chained so overlapping triggers (app backgrounded right after a
 * session ends, say) can't interleave their cancel and schedule steps.
 */
let reschedulingQueue: Promise<void> = Promise.resolve();

// ── Public API ────────────────────────────────────────────────────────

class NotificationService {
  /** Current reminder preferences, with the default time filled in. */
  async getSettings(): Promise<ReminderSettings> {
    const [enabled, storedTime, streakEnabled] = await Promise.all([
      settingsService.getRemindersEnabled(),
      settingsService.getReminderTime(),
      settingsService.getStreakRemindersEnabled(),
    ]);
    return {
      enabled,
      time: parseReminderTime(storedTime) ?? DEFAULT_REMINDER_TIME,
      streakEnabled,
    };
  }

  getPermission(): Promise<ReminderPermission> {
    return getPermission();
  }

  openSystemSettings(): Promise<void> {
    return Linking.openSettings();
  }

  /**
   * Rebuild the pending reminders from the user's current progress. Safe to
   * call as often as needed (app foreground/background, session end, setting
   * changes): it cancels our pending reminders and re-plans from scratch,
   * which is also what resets the back-off after the user opens the app.
   */
  rescheduleReminders(): Promise<void> {
    if (!isSupported) return Promise.resolve();

    reschedulingQueue = reschedulingQueue
      .catch(() => {})
      .then(async () => {
        try {
          await cancelOwnReminders();
          const settings = await this.getSettings();
          if (!settings.enabled) return;
          // Permission can be revoked in system settings at any time.
          if ((await getPermission()) !== 'granted') return;
          await scheduleReminders(settings);
        } catch (error) {
          // Reminders are a convenience; they must never crash the app.
          console.warn('[Reminders] Failed to reschedule:', error);
        }
      });
    return reschedulingQueue;
  }

  /**
   * Turn reminders on, asking for notification permission if needed.
   * On first enable, the time defaults to when the user usually practices.
   */
  async enableReminders(): Promise<ReminderPermission> {
    if (!isSupported) return 'denied';

    let permission = await getPermission();
    if (permission !== 'granted') {
      const result = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
      permission = result.granted ? 'granted' : 'denied';
    }
    if (permission !== 'granted') return permission;

    if ((await settingsService.getReminderTime()) === null) {
      const history = await statisticsService.getRecentReviewTimestamps();
      await settingsService.setReminderTime(
        formatReminderTime(getTypicalPracticeTime(history)),
      );
    }
    await settingsService.setRemindersEnabled(true);
    await this.rescheduleReminders();
    return 'granted';
  }

  async disableReminders(): Promise<void> {
    await settingsService.setRemindersEnabled(false);
    await this.rescheduleReminders();
  }

  async setReminderTime(time: ReminderTime): Promise<void> {
    await settingsService.setReminderTime(formatReminderTime(time));
    await this.rescheduleReminders();
  }

  async setStreakRemindersEnabled(enabled: boolean): Promise<void> {
    await settingsService.setStreakRemindersEnabled(enabled);
    await this.rescheduleReminders();
  }
}

export const notificationService = new NotificationService();
