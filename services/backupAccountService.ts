import { BackupError, pbRequest } from './backupApi';
import { SETTINGS_KEYS, settingsService } from './settingsService';

/**
 * The optional cloud-backup account (PocketBase `users`). Only Pro users who
 * choose to back up ever create one; the app works fully without it.
 *
 * The session token is kept in the local `settings` table, like the other
 * on-device state. It only grants access to this user's own backup and can be
 * revoked by signing out or deleting the account.
 */

export interface BackupSession {
  token: string;
  userId: string;
  email: string;
}

interface AuthResponse {
  token: string;
  record: { id: string; email: string };
}

const MIN_PASSWORD_LENGTH = 8;

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isAcceptablePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

async function saveSession(session: BackupSession): Promise<void> {
  await settingsService.setSetting(
    SETTINGS_KEYS.BACKUP_ACCOUNT,
    JSON.stringify(session),
  );
}

/** The signed-in account, or null. Never throws. */
export async function getSession(): Promise<BackupSession | null> {
  try {
    const raw = await settingsService.getSetting(SETTINGS_KEYS.BACKUP_ACCOUNT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BackupSession>;
    if (!parsed.token || !parsed.userId || !parsed.email) return null;
    return { token: parsed.token, userId: parsed.userId, email: parsed.email };
  } catch {
    return null;
  }
}

/** Forget the account on this device (the server-side account is untouched). */
export async function clearSession(): Promise<void> {
  await settingsService.setSetting(SETTINGS_KEYS.BACKUP_ACCOUNT, '');
  await settingsService.setSetting(SETTINGS_KEYS.BACKUP_LAST_SUCCESS, '');
  await settingsService.setSetting(SETTINGS_KEYS.BACKUP_LAST_ATTEMPT, '');
}

export async function signIn(
  email: string,
  password: string,
): Promise<BackupSession> {
  const response = await pbRequest<AuthResponse>(
    'collections/users/auth-with-password',
    {
      method: 'POST',
      body: { identity: email.trim().toLowerCase(), password },
    },
  );
  if (!response) throw new BackupError('server');

  const session: BackupSession = {
    token: response.token,
    userId: response.record.id,
    email: response.record.email,
  };
  // Switching accounts must not carry the previous account's backup time over.
  const previous = await getSession();
  if (previous && previous.userId !== session.userId) await clearSession();
  await saveSession(session);
  // Once someone has an account the Home nudge has done its job, even if they
  // sign out later.
  await settingsService.setSetting(SETTINGS_KEYS.BACKUP_NUDGE_DISMISSED, 'true');
  return session;
}

/** Create the account, then sign in with it. */
export async function register(
  email: string,
  password: string,
): Promise<BackupSession> {
  const normalized = email.trim().toLowerCase();
  if (!isPlausibleEmail(normalized)) throw new BackupError('invalid_email');
  if (!isAcceptablePassword(password)) throw new BackupError('weak_password');

  await pbRequest('collections/users/records', {
    method: 'POST',
    appKey: true,
    body: { email: normalized, password, passwordConfirm: password },
  });
  return signIn(normalized, password);
}

/** Sign out on this device. Local progress and the cloud backup are kept. */
export async function signOut(): Promise<void> {
  await clearSession();
}

/**
 * Permanently delete the account and its cloud backup (the `backups` rows are
 * cascade-deleted server-side). Local progress is untouched. Required by the
 * app stores for any app that lets people create an account.
 */
export async function deleteAccount(): Promise<void> {
  const session = await getSession();
  if (!session) throw new BackupError('not_signed_in');

  // A stale token (session_expired) is rethrown on purpose: the account was NOT
  // deleted, so the user has to sign in again and retry.
  await pbRequest(`collections/users/records/${session.userId}`, {
    method: 'DELETE',
    token: session.token,
  });
  await clearSession();
}

/**
 * Ask PocketBase to email a password-reset link. Always resolves the same way
 * for known and unknown addresses (PocketBase does not reveal which exist).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!isPlausibleEmail(email)) throw new BackupError('invalid_email');
  await pbRequest('collections/users/request-password-reset', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
  });
}
