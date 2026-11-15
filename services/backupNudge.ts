import { Platform } from 'react-native';
import { getSession } from './backupAccountService';
import { SETTINGS_KEYS, settingsService } from './settingsService';

/**
 * The Home-screen nudge that tells Pro users cloud backup exists. Backup lives
 * in Settings, which most people never open, so without this it is invisible.
 */

export interface BackupNudgeState {
  signedIn: boolean;
  dismissed: boolean;
}

/**
 * Show the nudge to Pro users who have not set up backup and have not waved
 * it away. Never on web (no SQLite, so no backup).
 */
export function shouldShowBackupNudge(options: {
  isPro: boolean;
  state: BackupNudgeState | null;
  platform?: string;
}): boolean {
  const { isPro, state, platform = Platform.OS } = options;
  if (platform === 'web' || !isPro || state === null) return false;
  return !state.signedIn && !state.dismissed;
}

export async function getBackupNudgeState(): Promise<BackupNudgeState> {
  const [session, dismissed] = await Promise.all([
    getSession(),
    settingsService.getSetting(SETTINGS_KEYS.BACKUP_NUDGE_DISMISSED),
  ]);
  return { signedIn: session !== null, dismissed: dismissed === 'true' };
}

/** "Not now" is permanent: the Settings row stays, the nudge doesn't nag. */
export async function dismissBackupNudge(): Promise<void> {
  await settingsService.setSetting(SETTINGS_KEYS.BACKUP_NUDGE_DISMISSED, 'true');
}
