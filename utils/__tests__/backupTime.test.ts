import { formatBackupTime } from '../backupTime';

describe('formatBackupTime', () => {
  it('formats an ISO timestamp', () => {
    expect(formatBackupTime('2026-11-15T10:55:47.242Z')).not.toBe('');
  });

  it('accepts the PocketBase format with a space instead of T', () => {
    expect(formatBackupTime('2026-11-15 10:55:47.242Z')).toBe(
      formatBackupTime('2026-11-15T10:55:47.242Z'),
    );
  });

  it('returns an empty string for missing or unparseable values', () => {
    expect(formatBackupTime(null)).toBe('');
    expect(formatBackupTime(undefined)).toBe('');
    expect(formatBackupTime('')).toBe('');
    expect(formatBackupTime('not a date')).toBe('');
  });
});
