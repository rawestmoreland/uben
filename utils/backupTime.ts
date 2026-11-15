/**
 * Locale-formatted date and time for a backup timestamp. Accepts ISO strings
 * and PocketBase's `2026-11-15 10:55:47.242Z` form (space instead of `T`,
 * which some JS engines refuse to parse). Returns '' for anything unparseable.
 */
export function formatBackupTime(value: string | null | undefined): string {
  if (!value) return '';
  const time = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(time.getTime())) return '';
  return time.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
