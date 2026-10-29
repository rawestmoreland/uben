/**
 * reminderPlanner.test.ts
 *
 * Covers the rules that keep practice reminders from being annoying (issue
 * #171): one a day at most, nothing when nothing is due, nothing for a day the
 * user already practiced, and automatic back-off while reminders are ignored.
 *
 * All dates are built from local parts so the suite is timezone-independent.
 */

import {
  formatReminderTime,
  getReminderSlots,
  getTypicalPracticeTime,
  parseReminderTime,
  planReminders,
  shiftReminderTime,
  toDateKey,
  type PlanInput,
} from '../reminderPlanner';

const EVENING = { hour: 18, minute: 0 };

/** Monday 2026-03-02 at the given local hour. */
function monday(hour: number): Date {
  return new Date(2026, 2, 2, hour, 0);
}

/** Every slot's day marked as having `count` cards due. */
function dueEveryDay(slots: Date[], count = 5): Record<string, number> {
  return Object.fromEntries(slots.map((slot) => [toDateKey(slot), count]));
}

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    now: monday(9),
    dueByDate: {},
    hasReviewedToday: false,
    streak: 0,
    streakRemindersEnabled: false,
    ...overrides,
  };
}

describe('getReminderSlots', () => {
  it('starts today when the reminder time is still ahead and nothing was practiced', () => {
    const slots = getReminderSlots(monday(9), EVENING, false);
    expect(toDateKey(slots[0])).toBe('2026-03-02');
    expect(slots[0].getHours()).toBe(18);
  });

  it('starts tomorrow once the reminder time has passed', () => {
    const slots = getReminderSlots(monday(20), EVENING, false);
    expect(toDateKey(slots[0])).toBe('2026-03-03');
  });

  it('starts tomorrow when the user already practiced today', () => {
    const slots = getReminderSlots(monday(9), EVENING, true);
    expect(toDateKey(slots[0])).toBe('2026-03-03');
  });

  it('backs off: three daily, two every other day, two weekly, then stops', () => {
    const slots = getReminderSlots(monday(9), EVENING, true);
    expect(slots.map(toDateKey)).toEqual([
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-07',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
    ]);
  });

  it('never schedules two slots on the same day', () => {
    const keys = getReminderSlots(monday(9), EVENING, false).map(toDateKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the wall-clock time across a DST change', () => {
    // US clocks spring forward on 2026-03-08.
    const slots = getReminderSlots(new Date(2026, 2, 6, 20), EVENING, false);
    slots.forEach((slot) => expect(slot.getHours()).toBe(18));
  });
});

describe('planReminders', () => {
  it('sends nothing when no cards are due', () => {
    const now = monday(9);
    const slots = getReminderSlots(now, EVENING, false);
    expect(planReminders(slots, input({ now }))).toEqual([]);
  });

  it('skips days without due cards but keeps the others', () => {
    const now = monday(9);
    const slots = getReminderSlots(now, EVENING, false);
    const dueByDate = { [toDateKey(slots[1])]: 7 };

    const planned = planReminders(slots, input({ now, dueByDate }));

    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({ kind: 'due', dueCount: 7 });
    expect(toDateKey(planned[0].fireAt)).toBe(toDateKey(slots[1]));
  });

  it('plans at most one reminder per day', () => {
    const now = monday(9);
    const slots = getReminderSlots(now, EVENING, false);
    const planned = planReminders(
      slots,
      input({
        now,
        dueByDate: dueEveryDay(slots),
        streak: 10,
        streakRemindersEnabled: true,
      }),
    );

    const keys = planned.map((reminder) => toDateKey(reminder.fireAt));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('plans nothing for today once the user has practiced', () => {
    const now = monday(9);
    const slots = getReminderSlots(now, EVENING, true);
    const planned = planReminders(
      slots,
      input({ now, hasReviewedToday: true, dueByDate: dueEveryDay(slots) }),
    );

    expect(planned.map((r) => toDateKey(r.fireAt))).not.toContain('2026-03-02');
  });

  it('never schedules more reminders than the back-off ladder allows', () => {
    const now = monday(9);
    const slots = getReminderSlots(now, EVENING, false);
    const planned = planReminders(
      slots,
      input({ now, dueByDate: dueEveryDay(slots) }),
    );
    expect(planned.length).toBeLessThanOrEqual(7);
  });

  describe('streak reminder', () => {
    const streakInput = (overrides: Partial<PlanInput> = {}) =>
      input({ streak: 5, streakRemindersEnabled: true, ...overrides });

    it('is off unless the user opted in', () => {
      const now = monday(9);
      const slots = getReminderSlots(now, EVENING, false);
      const planned = planReminders(
        slots,
        streakInput({
          now,
          streakRemindersEnabled: false,
          dueByDate: dueEveryDay(slots),
        }),
      );
      expect(planned.every((reminder) => reminder.kind === 'due')).toBe(true);
    });

    it('replaces today’s reminder when the streak is at risk', () => {
      const now = monday(9);
      const slots = getReminderSlots(now, EVENING, false);
      const planned = planReminders(
        slots,
        streakInput({ now, dueByDate: dueEveryDay(slots) }),
      );

      expect(planned[0]).toMatchObject({ kind: 'streak' });
      expect(toDateKey(planned[0].fireAt)).toBe('2026-03-02');
      expect(planned.slice(1).every((r) => r.kind === 'due')).toBe(true);
    });

    it('targets tomorrow when the user practiced today', () => {
      const now = monday(9);
      const slots = getReminderSlots(now, EVENING, true);
      const planned = planReminders(
        slots,
        streakInput({ now, hasReviewedToday: true }),
      );

      expect(planned).toHaveLength(1);
      expect(planned[0]).toMatchObject({ kind: 'streak' });
      expect(toDateKey(planned[0].fireAt)).toBe('2026-03-03');
    });

    it('fires even when nothing is due, since new cards keep a streak alive', () => {
      const now = monday(9);
      const slots = getReminderSlots(now, EVENING, false);
      const planned = planReminders(slots, streakInput({ now }));
      expect(planned).toHaveLength(1);
      expect(planned[0].kind).toBe('streak');
    });

    it('is skipped for short streaks', () => {
      const now = monday(9);
      const slots = getReminderSlots(now, EVENING, false);
      const planned = planReminders(slots, streakInput({ now, streak: 2 }));
      expect(planned).toEqual([]);
    });

    it('is skipped when today’s reminder time already passed (streak breaks anyway)', () => {
      const now = monday(20);
      const slots = getReminderSlots(now, EVENING, false);
      const planned = planReminders(
        slots,
        streakInput({ now, dueByDate: dueEveryDay(slots) }),
      );
      expect(planned.every((reminder) => reminder.kind === 'due')).toBe(true);
    });
  });
});

describe('reminder time helpers', () => {
  it('parses and formats HH:MM', () => {
    expect(parseReminderTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(formatReminderTime({ hour: 7, minute: 5 })).toBe('07:05');
  });

  it.each([null, '', '7', '24:00', '12:60', 'ab:cd'])(
    'rejects malformed value %p',
    (value) => {
      expect(parseReminderTime(value)).toBeNull();
    },
  );

  it('shifts by hours and wraps around midnight', () => {
    expect(shiftReminderTime({ hour: 23, minute: 30 }, 1)).toEqual({
      hour: 0,
      minute: 30,
    });
    expect(shiftReminderTime({ hour: 0, minute: 0 }, -1)).toEqual({
      hour: 23,
      minute: 0,
    });
  });
});

describe('getTypicalPracticeTime', () => {
  /** SQLite `CURRENT_TIMESTAMP` string for a local wall-clock time. */
  function sqliteUtc(day: number, hour: number): string {
    return new Date(2026, 0, day, hour, 15)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
  }

  it('returns the median local hour', () => {
    const stamps = [
      ...Array.from({ length: 8 }, (_, i) => sqliteUtc(i + 1, 7)),
      ...Array.from({ length: 3 }, (_, i) => sqliteUtc(i + 10, 21)),
    ];
    expect(getTypicalPracticeTime(stamps)).toEqual({ hour: 7, minute: 0 });
  });

  it('falls back when there is too little history', () => {
    expect(getTypicalPracticeTime([sqliteUtc(1, 7)])).toEqual({
      hour: 18,
      minute: 0,
    });
  });

  it('ignores unparseable timestamps', () => {
    const stamps = Array.from({ length: 9 }, () => 'not a date');
    expect(getTypicalPracticeTime(stamps, { hour: 12, minute: 0 })).toEqual({
      hour: 12,
      minute: 0,
    });
  });
});
