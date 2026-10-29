/**
 * notificationService.test.ts
 *
 * Verifies how practice reminders (issue #171) are wired to expo-notifications:
 * nothing is scheduled while disabled or without permission, only our own
 * pending reminders are ever cancelled, and the copy reflects the user's data.
 * The day-by-day rules themselves are covered in reminderPlanner.test.ts.
 */

import { notificationService } from '../notificationService';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock('@/services/settingsService', () => ({
  settingsService: {
    getRemindersEnabled: jest.fn(),
    setRemindersEnabled: jest.fn(),
    getReminderTime: jest.fn(),
    setReminderTime: jest.fn(),
    getStreakRemindersEnabled: jest.fn(),
    setStreakRemindersEnabled: jest.fn(),
  },
}));

jest.mock('@/services/spacedRepetitionService', () => ({
  spacedRepetitionService: {
    hasReviewedToday: jest.fn(),
    getStudyStreak: jest.fn(),
    getCumulativeDueCounts: jest.fn(),
  },
}));

jest.mock('@/services/statisticsService', () => ({
  statisticsService: { getRecentReviewTimestamps: jest.fn() },
}));

const Notifications = jest.requireMock('expo-notifications');
const settings = jest.requireMock('@/services/settingsService').settingsService;
const srs = jest.requireMock(
  '@/services/spacedRepetitionService',
).spacedRepetitionService;
const stats = jest.requireMock(
  '@/services/statisticsService',
).statisticsService;

/** Every candidate day has 12 cards due. */
function everyDayHasDueCards() {
  srs.getCumulativeDueCounts.mockImplementation(async (keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, 12])),
  );
}

describe('notificationService.rescheduleReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date(2026, 2, 2, 9, 0) });

    settings.getRemindersEnabled.mockResolvedValue(true);
    settings.getReminderTime.mockResolvedValue('18:00');
    settings.getStreakRemindersEnabled.mockResolvedValue(false);
    srs.hasReviewedToday.mockResolvedValue(false);
    srs.getStudyStreak.mockResolvedValue(0);
    everyDayHasDueCards();
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancels but never schedules while reminders are disabled', async () => {
    settings.getRemindersEnabled.mockResolvedValue(false);
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'practice-reminder-2026-03-02' },
    ]);

    await notificationService.rescheduleReminders();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'practice-reminder-2026-03-02',
    );
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not schedule when notification permission was revoked', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });

    await notificationService.rescheduleReminders();

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('only cancels reminders it scheduled itself', async () => {
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'practice-reminder-2026-03-02' },
      { identifier: 'something-else' },
    ]);

    await notificationService.rescheduleReminders();

    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'practice-reminder-2026-03-02',
    );
  });

  it('schedules one date-triggered reminder per day at the chosen time', async () => {
    await notificationService.rescheduleReminders();

    const calls = Notifications.scheduleNotificationAsync.mock.calls.map(
      ([request]: [any]) => request,
    );
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toMatchObject({
      identifier: 'practice-reminder-2026-03-02',
      trigger: { type: 'date', channelId: 'practice-reminders' },
    });
    expect(calls[0].trigger.date).toEqual(new Date(2026, 2, 2, 18, 0));

    const ids = calls.map((call: { identifier: string }) => call.identifier);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts the due count in the body and links to the quiz', async () => {
    await notificationService.rescheduleReminders();

    const { content } =
      Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.body).toContain('12 words');
    expect(content.data).toEqual({ url: '/quiz' });
  });

  it('uses the streak message only when the streak reminder is on', async () => {
    srs.getStudyStreak.mockResolvedValue(8);
    srs.hasReviewedToday.mockResolvedValue(false);

    await notificationService.rescheduleReminders();
    const withoutOptIn =
      Notifications.scheduleNotificationAsync.mock.calls[0][0].content.body;
    expect(withoutOptIn).not.toContain('streak');

    Notifications.scheduleNotificationAsync.mockClear();
    settings.getStreakRemindersEnabled.mockResolvedValue(true);

    await notificationService.rescheduleReminders();
    const withOptIn =
      Notifications.scheduleNotificationAsync.mock.calls[0][0].content.body;
    expect(withOptIn).toContain('8');
    expect(withOptIn).toContain('streak');
  });

  it('keeps going if scheduling throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    Notifications.scheduleNotificationAsync.mockRejectedValueOnce(
      new Error('boom'),
    );

    await expect(
      notificationService.rescheduleReminders(),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('notificationService.enableReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settings.getRemindersEnabled.mockResolvedValue(false);
    settings.getStreakRemindersEnabled.mockResolvedValue(false);
    settings.getReminderTime.mockResolvedValue(null);
    stats.getRecentReviewTimestamps.mockResolvedValue([]);
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  it('stays off when the user declines the system permission', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(notificationService.enableReminders()).resolves.toBe('denied');
    expect(settings.setRemindersEnabled).not.toHaveBeenCalled();
  });

  it('turns on and picks the default time when there is no history', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });

    await expect(notificationService.enableReminders()).resolves.toBe(
      'granted',
    );
    expect(settings.setReminderTime).toHaveBeenCalledWith('18:00');
    expect(settings.setRemindersEnabled).toHaveBeenCalledWith(true);
  });

  it('keeps a time the user already chose', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });
    settings.getReminderTime.mockResolvedValue('07:00');

    await notificationService.enableReminders();

    expect(settings.setReminderTime).not.toHaveBeenCalled();
  });
});
