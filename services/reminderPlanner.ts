/**
 * Pure scheduling logic for practice reminders.
 *
 * Nothing in here touches SQLite or expo-notifications, so the rules that keep
 * reminders helpful rather than annoying can be unit tested in isolation:
 *
 * - At most one reminder per day.
 * - Never remind for a day the user already practiced (or whose time has passed).
 * - Only remind on days when cards are due.
 * - Back off automatically while the user keeps ignoring reminders.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface ReminderTime {
  hour: number;
  minute: number;
}

export type ReminderKind = 'due' | 'streak';

export interface PlannedReminder {
  fireAt: Date;
  kind: ReminderKind;
  /** Cards due on `fireAt`'s day. Only meaningful for `kind: 'due'`. */
  dueCount: number;
  /** Rotates the notification copy so it doesn't read the same every day. */
  variant: number;
}

export interface PlanInput {
  now: Date;
  /** Local `YYYY-MM-DD` -> cards due on or before that day, if not practiced. */
  dueByDate: Record<string, number>;
  hasReviewedToday: boolean;
  /** Current study streak in days (0 when broken). */
  streak: number;
  streakRemindersEnabled: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 18, minute: 0 };

/** A streak shorter than this isn't worth a dedicated "save it" nudge. */
export const STREAK_REMINDER_MIN_STREAK = 3;

/** Number of rotating copy variants (`due_body_a`..`due_body_c` in the locales). */
export const REMINDER_COPY_VARIANTS = 3;

/** Minimum reviews before the user's history is trusted to suggest a time. */
const MIN_REVIEWS_FOR_SUGGESTION = 10;

/**
 * Day gaps between consecutive reminders when the user never opens the app:
 * three daily, two every other day, two weekly, then silence.
 * Opening the app reschedules from scratch, which resets the ladder.
 */
const BACKOFF_GAPS_IN_DAYS = [0, 1, 1, 2, 2, 7, 7];

// ── Date helpers ──────────────────────────────────────────────────────

/** Local calendar date as `YYYY-MM-DD` (matches `card_progress.next_review_date`). */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The given local day plus `days`, at `time`. Built from parts so DST can't shift the hour. */
function atLocalTime(base: Date, days: number, time: ReminderTime): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + days,
    time.hour,
    time.minute,
  );
}

function daysBetween(from: Date, to: Date): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay.getTime() - fromDay.getTime()) / 86_400_000);
}

// ── Reminder time ─────────────────────────────────────────────────────

/** Parse `HH:MM`. Returns `null` for anything malformed. */
export function parseReminderTime(value: string | null): ReminderTime | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatReminderTime(time: ReminderTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/** Move a reminder time by whole hours, wrapping around midnight. */
export function shiftReminderTime(
  time: ReminderTime,
  hours: number,
): ReminderTime {
  return { hour: (((time.hour + hours) % 24) + 24) % 24, minute: time.minute };
}

/**
 * The hour (local time) the user most often practices, as the median of their
 * review timestamps. `reviewedAtUtc` values are SQLite `CURRENT_TIMESTAMP`
 * strings (`YYYY-MM-DD HH:MM:SS`, UTC). Falls back when there is too little
 * history to be meaningful.
 */
export function getTypicalPracticeTime(
  reviewedAtUtc: string[],
  fallback: ReminderTime = DEFAULT_REMINDER_TIME,
): ReminderTime {
  const hours = reviewedAtUtc
    .map((value) => new Date(`${value.replace(' ', 'T')}Z`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => date.getHours())
    .sort((a, b) => a - b);

  if (hours.length < MIN_REVIEWS_FOR_SUGGESTION) return fallback;
  return { hour: hours[Math.floor(hours.length / 2)], minute: 0 };
}

// ── Planning ──────────────────────────────────────────────────────────

/**
 * Candidate fire times, before any "is anything due?" filtering.
 *
 * The first slot is today if the user hasn't practiced yet and the reminder
 * time is still ahead, otherwise tomorrow. The rest follow the back-off ladder.
 */
export function getReminderSlots(
  now: Date,
  time: ReminderTime,
  hasReviewedToday: boolean,
): Date[] {
  const todaySlot = atLocalTime(now, 0, time);
  const firstOffset = !hasReviewedToday && todaySlot > now ? 0 : 1;

  let offset = firstOffset;
  return BACKOFF_GAPS_IN_DAYS.map((gap) => {
    offset += gap;
    return atLocalTime(now, offset, time);
  });
}

/**
 * Turn candidate slots into the reminders to actually schedule.
 *
 * `slots[0]` is the day the streak would break if the user skipped it, so the
 * (opt-in) streak message only ever replaces that day's reminder; it never
 * adds a second notification. Every other slot needs cards due.
 */
export function planReminders(
  slots: Date[],
  input: PlanInput,
): PlannedReminder[] {
  const { now, dueByDate, hasReviewedToday, streak } = input;

  // Streak is saved by practicing today if the user hasn't yet, otherwise
  // tomorrow. A first slot later than that means the streak is already lost.
  const streakDayOffset = hasReviewedToday ? 1 : 0;
  const isStreakAtRisk =
    input.streakRemindersEnabled &&
    streak >= STREAK_REMINDER_MIN_STREAK &&
    slots.length > 0 &&
    daysBetween(now, slots[0]) === streakDayOffset;

  const reminders: PlannedReminder[] = [];
  slots.forEach((fireAt, index) => {
    const variant =
      Math.floor(fireAt.getTime() / 86_400_000) % REMINDER_COPY_VARIANTS;

    if (index === 0 && isStreakAtRisk) {
      reminders.push({ fireAt, kind: 'streak', dueCount: 0, variant });
      return;
    }

    const dueCount = dueByDate[toDateKey(fireAt)] ?? 0;
    if (dueCount > 0) {
      reminders.push({ fireAt, kind: 'due', dueCount, variant });
    }
  });

  return reminders;
}
