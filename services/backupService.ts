import { getDatabase } from '@/database/db';
import { BACKUP_PAYLOAD_VERSION, type RestoreSummary } from '@/types/backup';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BackupError, pbRequest } from './backupApi';
import { clearSession, getSession, type BackupSession } from './backupAccountService';
import {
  BackupPayloadError,
  buildBackupPayload,
  restoreBackupPayload,
} from './backupPayloadService';
import { purchaseService } from './purchaseService';
import { SETTINGS_KEYS, settingsService } from './settingsService';

/**
 * Cloud backup for Pro users: upload / download of the progress snapshot built
 * by `backupPayloadService`. Offline-first: every failure is a `BackupError`
 * the UI can show, and nothing here is ever on the quiz's critical path.
 */

/** Automatic backups run at most this often. */
export const AUTO_BACKUP_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
/** After any automatic attempt (even a failed one), wait this long before retrying. */
export const AUTO_BACKUP_RETRY_INTERVAL_MS = 60 * 60 * 1000;

export interface RemoteBackupInfo {
  /** ISO timestamp of when the backup was last written. */
  updatedAt: string;
  cardCount: number;
  appVersion: string;
  payloadVersion: number;
}

export interface BackupStatus {
  signedIn: boolean;
  email: string | null;
  /** Last successful upload from this device (ISO), or null. */
  lastBackupAt: string | null;
  autoBackupEnabled: boolean;
}

interface BackupRecord {
  id: string;
  updated: string;
  payload_version: number;
  app_version: string;
  card_count: number;
  payload?: unknown;
}

interface BackupList {
  items: BackupRecord[];
}

let inFlight: Promise<unknown> | null = null;

/** Only one backup/restore at a time: an auto backup must not race a manual restore. */
async function exclusive<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight) throw new BackupError('busy');
  const running = task();
  inFlight = running.catch(() => undefined);
  try {
    return await running;
  } finally {
    inFlight = null;
  }
}

async function requireSession(): Promise<BackupSession> {
  if (Platform.OS === 'web') throw new BackupError('not_configured');
  const session = await getSession();
  if (!session) throw new BackupError('not_signed_in');
  return session;
}

async function requirePro(): Promise<void> {
  if (!(await purchaseService.isProUnlocked())) throw new BackupError('not_pro');
}

/** A rejected token means the session is dead: forget it so the UI asks to sign in. */
async function dropSessionIfExpired(error: unknown): Promise<void> {
  if (error instanceof BackupError && error.code === 'session_expired') {
    await clearSession().catch(() => undefined);
  }
}

async function fetchRecord(
  session: BackupSession,
  withPayload: boolean,
): Promise<BackupRecord | null> {
  // The collection rules scope the list to the caller's own row.
  const list = await pbRequest<BackupList>('collections/backups/records', {
    token: session.token,
    query: {
      perPage: '1',
      ...(withPayload ? {} : { fields: 'id,updated,payload_version,app_version,card_count' }),
    },
  });
  return list?.items[0] ?? null;
}

export const backupService = {
  async getStatus(): Promise<BackupStatus> {
    const session = await getSession();
    const [lastBackupAt, autoSetting] = await Promise.all([
      settingsService.getSetting(SETTINGS_KEYS.BACKUP_LAST_SUCCESS),
      settingsService.getSetting(SETTINGS_KEYS.BACKUP_AUTO_ENABLED),
    ]);
    return {
      signedIn: session !== null,
      email: session?.email ?? null,
      lastBackupAt: lastBackupAt || null,
      autoBackupEnabled: autoSetting !== 'false',
    };
  },

  async setAutoBackupEnabled(enabled: boolean): Promise<void> {
    await settingsService.setSetting(
      SETTINGS_KEYS.BACKUP_AUTO_ENABLED,
      enabled ? 'true' : 'false',
    );
  },

  /** What is stored in the cloud for this account, or null if nothing yet. */
  async getRemoteBackupInfo(): Promise<RemoteBackupInfo | null> {
    const session = await requireSession();
    try {
      const record = await fetchRecord(session, false);
      if (!record) return null;
      return {
        updatedAt: record.updated,
        cardCount: record.card_count ?? 0,
        appVersion: record.app_version ?? '',
        payloadVersion: record.payload_version,
      };
    } catch (error) {
      await dropSessionIfExpired(error);
      throw error;
    }
  },

  /** Upload a fresh snapshot, replacing the previous cloud backup. */
  async backUpNow(): Promise<{ cardCount: number }> {
    return exclusive(async () => {
      await requirePro();
      const session = await requireSession();

      try {
        const payload = await buildBackupPayload(getDatabase());
        const fields = {
          payload,
          payload_version: payload.version,
          app_version: Constants.expoConfig?.version ?? '',
          card_count: payload.cards.length,
        };

        const existing = await fetchRecord(session, false);
        if (existing) {
          // `user` is immutable server-side, so it is only sent on create.
          await pbRequest(`collections/backups/records/${existing.id}`, {
            method: 'PATCH',
            token: session.token,
            body: fields,
          });
        } else {
          await pbRequest('collections/backups/records', {
            method: 'POST',
            token: session.token,
            body: { user: session.userId, ...fields },
          });
        }

        await settingsService.setSetting(
          SETTINGS_KEYS.BACKUP_LAST_SUCCESS,
          new Date().toISOString(),
        );
        return { cardCount: payload.cards.length };
      } catch (error) {
        await dropSessionIfExpired(error);
        throw error;
      }
    });
  },

  /**
   * Download the cloud backup and apply it to this device in one transaction.
   * A backed-up card overwrites the local card for the same word.
   */
  async restore(): Promise<RestoreSummary> {
    return exclusive(async () => {
      await requirePro();
      const session = await requireSession();

      let record: BackupRecord | null;
      try {
        record = await fetchRecord(session, true);
      } catch (error) {
        await dropSessionIfExpired(error);
        throw error;
      }
      if (!record) throw new BackupError('no_backup');
      if (record.payload_version > BACKUP_PAYLOAD_VERSION) {
        throw new BackupError('unsupported_version');
      }

      try {
        return await restoreBackupPayload(getDatabase(), record.payload);
      } catch (error) {
        if (error instanceof BackupPayloadError) {
          throw new BackupError(
            error.code === 'unsupported_version' ? 'unsupported_version' : 'invalid_backup',
          );
        }
        throw error;
      }
    });
  },

  /**
   * Back up in the background if the user is signed in, Pro, has automatic
   * backup on, and it has been a while. Never throws and never blocks.
   */
  async maybeAutoBackup(now: number = Date.now()): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
      const status = await this.getStatus();
      if (!status.signedIn || !status.autoBackupEnabled) return false;

      const lastAttempt = await settingsService.getSetting(
        SETTINGS_KEYS.BACKUP_LAST_ATTEMPT,
      );
      if (isRecent(lastAttempt, now, AUTO_BACKUP_RETRY_INTERVAL_MS)) return false;
      if (isRecent(status.lastBackupAt, now, AUTO_BACKUP_MIN_INTERVAL_MS)) return false;

      await settingsService.setSetting(
        SETTINGS_KEYS.BACKUP_LAST_ATTEMPT,
        new Date(now).toISOString(),
      );
      await this.backUpNow();
      return true;
    } catch (error) {
      // Offline, not Pro, expired session, busy: all fine to ignore here.
      console.warn('[Backup] Automatic backup skipped:', (error as Error).message);
      return false;
    }
  },
};

function isRecent(
  iso: string | null,
  now: number,
  windowMs: number,
): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && now - time < windowMs;
}
