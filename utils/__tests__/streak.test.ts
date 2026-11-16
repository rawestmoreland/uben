import {
  calculateCurrentStreak,
  calculateLongestStreak,
  dayNumber,
  hasStudiedOn,
  toLocalDayKey,
} from '../streak';

describe('toLocalDayKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Built from local components, so these hold in every timezone
    expect(toLocalDayKey(new Date(2026, 10, 16, 23, 59, 59))).toBe(
      '2026-11-16',
    );
    expect(toLocalDayKey(new Date(2026, 10, 17, 0, 0, 1))).toBe('2026-11-17');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDayKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('dayNumber', () => {
  it('differs by exactly 1 for consecutive days, across DST changes and month ends', () => {
    expect(dayNumber('2026-03-09') - dayNumber('2026-03-08')).toBe(1); // US spring forward
    expect(dayNumber('2026-11-02') - dayNumber('2026-11-01')).toBe(1); // US fall back
    expect(dayNumber('2026-03-01') - dayNumber('2026-02-28')).toBe(1);
    expect(dayNumber('2027-01-01') - dayNumber('2026-12-31')).toBe(1);
  });

  it('is NaN for a malformed key', () => {
    expect(dayNumber('nope')).toBeNaN();
  });
});

describe('calculateCurrentStreak', () => {
  const today = '2026-11-16';

  it('is 0 with no study days', () => {
    expect(calculateCurrentStreak([], today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(
      calculateCurrentStreak(['2026-11-14', '2026-11-15', '2026-11-16'], today),
    ).toBe(3);
  });

  it('counts a single day as 1, and ignores several sessions on the same day', () => {
    expect(calculateCurrentStreak(['2026-11-16', '2026-11-16'], today)).toBe(1);
  });

  it('keeps the streak through today when only yesterday has been studied', () => {
    expect(calculateCurrentStreak(['2026-11-14', '2026-11-15'], today)).toBe(2);
  });

  it('resets once a full day has been missed', () => {
    expect(calculateCurrentStreak(['2026-11-13', '2026-11-14'], today)).toBe(0);
  });

  it('keeps yesterday-only alive until local midnight, then drops it the next day', () => {
    expect(calculateCurrentStreak(['2026-11-15'], '2026-11-16')).toBe(1);
    expect(calculateCurrentStreak(['2026-11-15'], '2026-11-17')).toBe(0);
  });

  it('only counts the run that ends at the latest day', () => {
    expect(
      calculateCurrentStreak(
        ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-15', '2026-11-16'],
        today,
      ),
    ).toBe(2);
  });

  it('does not depend on input order and skips malformed keys', () => {
    expect(
      calculateCurrentStreak(['2026-11-16', 'bad', '2026-11-15'], today),
    ).toBe(2);
  });

  it('counts across a month boundary and a DST change', () => {
    expect(
      calculateCurrentStreak(
        ['2026-10-31', '2026-11-01', '2026-11-02'],
        '2026-11-02',
      ),
    ).toBe(3);
  });

  it('is lenient about a study day dated after today (clock moved back)', () => {
    expect(calculateCurrentStreak(['2026-11-16', '2026-11-17'], today)).toBe(2);
  });
});

describe('calculateLongestStreak', () => {
  it('is 0 with no study days and 1 for a single day', () => {
    expect(calculateLongestStreak([])).toBe(0);
    expect(calculateLongestStreak(['2026-11-16'])).toBe(1);
  });

  it('finds the longest run among several', () => {
    expect(
      calculateLongestStreak([
        '2026-10-01',
        '2026-10-02',
        '2026-10-10',
        '2026-10-11',
        '2026-10-12',
        '2026-10-13',
        '2026-10-20',
      ]),
    ).toBe(4);
  });

  it('ignores duplicates', () => {
    expect(
      calculateLongestStreak(['2026-10-01', '2026-10-01', '2026-10-02']),
    ).toBe(2);
  });
});

describe('hasStudiedOn', () => {
  it('is true only when today itself is a study day', () => {
    expect(hasStudiedOn(['2026-11-15'], '2026-11-16')).toBe(false);
    expect(hasStudiedOn(['2026-11-15', '2026-11-16'], '2026-11-16')).toBe(true);
  });
});
