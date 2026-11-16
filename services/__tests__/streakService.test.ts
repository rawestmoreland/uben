/**
 * streakService.test.ts
 *
 * Streak = local calendar days with a finished quiz session. Runs against a
 * real in-memory SQLite database built by the real migrations (Node 22.5+
 * only, via node:sqlite; skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import { SpacedRepetitionService } from '../spacedRepetitionService';
import { StatisticsService } from '../statisticsService';
import { StreakService } from '../streakService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

const streaks = new StreakService();

/** A moment on the given local calendar day (month is 1-based). */
function localDay(month: number, day: number, hour = 12) {
  return new Date(2026, month - 1, day, hour);
}

describeWithSqlite('streakService against real SQLite', () => {
  let raw: NodeSqliteDatabase;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const opened = openTestDatabase();
    raw = opened.raw;
    mockActiveDb = opened.db;
    await runMigrations(opened.db as any);
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  it('starts at 0 with nothing studied', async () => {
    const now = localDay(11, 16);
    expect(await streaks.getCurrentStreak(now)).toBe(0);
    expect(await streaks.getLongestStreak()).toBe(0);
    expect(await streaks.hasStudiedToday(now)).toBe(false);
  });

  it('extends the streak once per day however many sessions finish', async () => {
    await streaks.recordStudyDay(localDay(11, 15));
    await streaks.recordStudyDay(localDay(11, 16, 9));
    await streaks.recordStudyDay(localDay(11, 16, 21));

    expect(
      raw.prepare('SELECT COUNT(*) AS count FROM study_days').get(),
    ).toEqual({ count: 2 });
    expect(await streaks.getCurrentStreak(localDay(11, 16))).toBe(2);
    expect(await streaks.hasStudiedToday(localDay(11, 16))).toBe(true);
  });

  it('attributes a late-night session to the local day it finished on', async () => {
    await streaks.recordStudyDay(localDay(11, 15, 23)); // 11:00 pm
    await streaks.recordStudyDay(localDay(11, 16, 0)); // just after midnight

    expect(await streaks.getCurrentStreak(localDay(11, 16, 0))).toBe(2);
  });

  it('keeps the streak until the end of the day after the last session, then resets', async () => {
    await streaks.recordStudyDay(localDay(11, 14));
    await streaks.recordStudyDay(localDay(11, 15));

    // Not yet studied today (11/16): still alive, just not extended
    expect(await streaks.getCurrentStreak(localDay(11, 16, 23))).toBe(2);
    expect(await streaks.hasStudiedToday(localDay(11, 16, 23))).toBe(false);
    // A full day (11/16) went by with no session
    expect(await streaks.getCurrentStreak(localDay(11, 17, 0))).toBe(0);
    // The longest streak is kept
    expect(await streaks.getLongestStreak()).toBe(2);
  });

  it('is exposed through the existing spaced repetition and statistics services', async () => {
    await streaks.recordStudyDay(new Date());

    expect(await new SpacedRepetitionService().getStudyStreak()).toBe(1);
    expect(await new SpacedRepetitionService().hasReviewedToday()).toBe(true);
    expect(await new StatisticsService().getLongestStreak()).toBe(1);
  });

  it('does not count answered cards until a session is finished', async () => {
    raw.exec(`
      INSERT INTO categories (id, name, display_name, display_order)
        VALUES (1, 'people', 'People', 1);
      INSERT INTO nouns (german, article, plural, level, category_id)
        VALUES ('Kind', 'das', 'Kinder', 'A1', 1);
    `);
    const spaced = new SpacedRepetitionService();
    const cardId = await spaced.createCardForWord('noun', 1);

    await spaced.recordReview(cardId, 5, 1500);

    expect(await spaced.getStudyStreak()).toBe(0);
    expect(await spaced.hasReviewedToday()).toBe(false);

    await streaks.recordStudyDay(new Date());

    expect(await spaced.getStudyStreak()).toBe(1);
    expect(await spaced.hasReviewedToday()).toBe(true);
  });
});
