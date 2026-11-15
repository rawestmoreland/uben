import { Platform } from 'react-native';
import { getSession } from './backupAccountService';
import { SETTINGS_KEYS, settingsService } from './settingsService';

/**
 * The Home-screen nudge that tells Pro users cloud backup exists. Backup lives
 * in Settings, which most people never open, so without this it is invisible.
 */

/**
 * Completed quiz sessions before the nudge appears. A backup protects
 * progress, so there should be some; and a Pro user who has just paid
 * shouldn't be asked for anything else yet.
 */
export const BACKUP_NUDGE_MIN_SESSIONS = 3;

export interface BackupNudgeState {
  signedIn: boolean;
  dismissed: boolean;
  /** Finished quiz sessions of any type (the store-review counter). */
  sessionsCompleted: number;
}

/**
 * Show the nudge to Pro users who have finished a few sessions, have not set
 * up backup and have not waved it away. Never on web (no SQLite, so no backup).
 */
export function shouldShowBackupNudge(options: {
  isPro: boolean;
  state: BackupNudgeState | null;
  platform?: string;
}): boolean {
  const { isPro, state, platform = Platform.OS } = options;
  if (platform === 'web' || !isPro || state === null) return false;
  return (
    !state.signedIn &&
    !state.dismissed &&
    state.sessionsCompleted >= BACKUP_NUDGE_MIN_SESSIONS
  );
}

export async function getBackupNudgeState(): Promise<BackupNudgeState> {
  const [session, dismissed, sessions] = await Promise.all([
    getSession(),
    settingsService.getSetting(SETTINGS_KEYS.BACKUP_NUDGE_DISMISSED),
    settingsService.getSetting(SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED),
  ]);
  const sessionsCompleted = Number.parseInt(sessions ?? '', 10);
  return {
    signedIn: session !== null,
    dismissed: dismissed === 'true',
    sessionsCompleted: Number.isFinite(sessionsCompleted) ? sessionsCompleted : 0,
  };
}

/** "Not now" is permanent: the Settings row stays, the nudge doesn't nag. */
export async function dismissBackupNudge(): Promise<void> {
  await settingsService.setSetting(SETTINGS_KEYS.BACKUP_NUDGE_DISMISSED, 'true');
}
