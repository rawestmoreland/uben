/**
 * Pure streak rules (Duolingo-style). No database, no clock: callers pass in
 * the days and "today", so everything here is deterministic and unit tested.
 *
 * A streak day is a *local calendar day* (the device's day, `YYYY-MM-DD`) on
 * which the user finished at least one quiz session:
 *
 *  - Finishing more sessions the same day adds nothing.
 *  - Today is never a miss while it is still going: practicing yesterday keeps
 *    the streak alive until the end of today.
 *  - The streak resets once a full local calendar day passes with no finished
 *    session, i.e. at the first local midnight after the missed day.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The local calendar day of a moment as `YYYY-MM-DD`, read from the device's
 * local time (not UTC, which is what `toISOString()` would give).
 */
export function toLocalDayKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole-day index of a `YYYY-MM-DD` key. Computed in UTC so consecutive
 * calendar days always differ by exactly 1, even across a DST change (a
 * local-midnight difference in milliseconds would be 23 or 25 hours then).
 * Returns NaN for a malformed key.
 */
export function dayNumber(dayKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dayKey);
  if (!match) return NaN;
  const [, year, month, day] = match;
  return Math.round(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) / MS_PER_DAY,
  );
}

/** Distinct, valid day numbers in ascending order. */
function sortedDayNumbers(dayKeys: readonly string[]): number[] {
  const unique = new Set<number>();
  for (const dayKey of dayKeys) {
    const value = dayNumber(dayKey);
    if (Number.isFinite(value)) unique.add(value);
  }
  return [...unique].sort((first, second) => first - second);
}

/**
 * Current streak in days as of `todayKey`.
 *
 * The run of consecutive days ending at the most recent study day counts only
 * while that day is today or yesterday. A study day dated after today (the
 * user travelled west or the device clock moved back) is treated leniently as
 * "now" rather than breaking the streak.
 */
export function calculateCurrentStreak(
  dayKeys: readonly string[],
  todayKey: string,
): number {
  const days = sortedDayNumbers(dayKeys);
  const today = dayNumber(todayKey);
  if (days.length === 0 || !Number.isFinite(today)) return 0;

  const latest = days[days.length - 1];
  if (latest < today - 1) return 0;

  let streak = 1;
  for (let index = days.length - 2; index >= 0; index--) {
    if (days[index] !== days[index + 1] - 1) break;
    streak++;
  }
  return streak;
}

/** Longest run of consecutive study days ever recorded. */
export function calculateLongestStreak(dayKeys: readonly string[]): number {
  const days = sortedDayNumbers(dayKeys);
  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let index = 1; index < days.length; index++) {
    current = days[index] === days[index - 1] + 1 ? current + 1 : 1;
    if (current > longest) longest = current;
  }
  return longest;
}

/** True when `todayKey` itself is a study day. */
export function hasStudiedOn(
  dayKeys: readonly string[],
  todayKey: string,
): boolean {
  const today = dayNumber(todayKey);
  if (!Number.isFinite(today)) return false;
  return dayKeys.some((dayKey) => dayNumber(dayKey) === today);
}
