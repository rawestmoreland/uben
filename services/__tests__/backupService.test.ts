/**
 * backupService.test.ts
 *
 * Account + upload/download flow with `fetch`, settings, purchases and the
 * payload builder mocked. The payload itself is covered by
 * backupPayloadService.test.ts against real SQLite.
 */

import { BackupError } from '../backupApi';
import {
  deleteAccount,
  getSession,
  register,
  signIn,
  signOut,
} from '../backupAccountService';
import {
  AUTO_BACKUP_MIN_INTERVAL_MS,
  AUTO_BACKUP_RETRY_INTERVAL_MS,
  backupService,
} from '../backupService';
import { BackupPayloadError } from '../backupPayloadService';
import { SETTINGS_KEYS, settingsService } from '../settingsService';

jest.mock('@/constants/pocketbase', () => ({
  PB_URL: 'https://pb.test',
  PB_API_KEY: 'app-key',
}));
jest.mock('@/database/db', () => ({ getDatabase: () => ({ fake: 'db' }) }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.15.0' } },
}));
jest.mock('../purchaseService', () => ({
  purchaseService: { isProUnlocked: jest.fn() },
}));
jest.mock('../backupPayloadService', () => ({
  ...jest.requireActual('../backupPayloadService'),
  buildBackupPayload: jest.fn(),
  restoreBackupPayload: jest.fn(),
}));

const mockPro = jest.requireMock('../purchaseService').purchaseService
  .isProUnlocked as jest.Mock;
const mockBuild = jest.requireMock('../backupPayloadService')
  .buildBackupPayload as jest.Mock;
const mockRestore = jest.requireMock('../backupPayloadService')
  .restoreBackupPayload as jest.Mock;
const mockFetch = jest.fn();

let store: Map<string, string>;

const PAYLOAD = { version: 1, cards: [[], []], nouns: [], adjectives: [], verbs: [], settings: {} };

function json(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null ? '' : JSON.stringify(body)),
    json: async () => body,
  };
}

const AUTH = { token: 'tok-1', record: { id: 'user1', email: 'a@test.dev' } };

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = mockFetch;
  store = new Map();
  jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key) => store.get(key) ?? null);
  jest.spyOn(settingsService, 'setSetting').mockImplementation(async (key, value) => {
    store.set(key, value);
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockPro.mockResolvedValue(true);
  mockBuild.mockResolvedValue(PAYLOAD);
});

async function signedIn() {
  mockFetch.mockResolvedValueOnce(json(200, AUTH));
  await signIn('A@Test.dev ', 'password123');
  mockFetch.mockReset();
}

describe('account', () => {
  it('registers with the app key, then signs in and stores the session', async () => {
    mockFetch.mockResolvedValueOnce(json(200, {})).mockResolvedValueOnce(json(200, AUTH));

    const session = await register(' A@Test.dev ', 'password123');

    expect(mockFetch.mock.calls[0][0]).toBe('https://pb.test/api/collections/users/records?key=app-key');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      email: 'a@test.dev', password: 'password123', passwordConfirm: 'password123',
    });
    expect(session).toEqual({ token: 'tok-1', userId: 'user1', email: 'a@test.dev' });
    await expect(getSession()).resolves.toEqual(session);
  });

  it('rejects bad input before any network call', async () => {
    await expect(register('nope', 'password123')).rejects.toMatchObject({ code: 'invalid_email' });
    await expect(register('a@test.dev', 'short')).rejects.toMatchObject({ code: 'weak_password' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('maps server errors: taken email, wrong password, rate limit, offline', async () => {
    mockFetch.mockResolvedValueOnce(json(400, { data: { email: { code: 'validation_not_unique' } } }));
    await expect(register('a@test.dev', 'password123')).rejects.toMatchObject({ code: 'email_taken' });

    mockFetch.mockResolvedValueOnce(json(400, { message: 'Failed to authenticate.' }));
    await expect(signIn('a@test.dev', 'wrongpass')).rejects.toMatchObject({ code: 'invalid_credentials' });

    mockFetch.mockResolvedValueOnce(json(429));
    await expect(signIn('a@test.dev', 'x')).rejects.toMatchObject({ code: 'rate_limited' });

    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(signIn('a@test.dev', 'x')).rejects.toMatchObject({ code: 'offline' });
    await expect(getSession()).resolves.toBeNull();
  });

  it('signs out locally and forgets the last backup time', async () => {
    await signedIn();
    store.set(SETTINGS_KEYS.BACKUP_LAST_SUCCESS, '2026-11-01T00:00:00.000Z');

    await signOut();

    await expect(getSession()).resolves.toBeNull();
    expect((await backupService.getStatus()).lastBackupAt).toBeNull();
  });

  it('deletes the account on the server, then forgets it locally', async () => {
    await signedIn();
    mockFetch.mockResolvedValueOnce(json(204, null));

    await deleteAccount();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://pb.test/api/collections/users/records/user1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('tok-1');
    await expect(getSession()).resolves.toBeNull();
  });

  it('keeps the session and reports failure when the server refuses the delete', async () => {
    await signedIn();
    mockFetch.mockResolvedValueOnce(json(401));

    await expect(deleteAccount()).rejects.toMatchObject({ code: 'session_expired' });
    await expect(getSession()).resolves.not.toBeNull();
  });
});

describe('backUpNow', () => {
  it('creates the backup when none exists, with the user and compact metadata', async () => {
    await signedIn();
    mockFetch
      .mockResolvedValueOnce(json(200, { items: [] }))
      .mockResolvedValueOnce(json(200, { id: 'b1' }));

    await expect(backupService.backUpNow()).resolves.toEqual({ cardCount: 2 });

    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('https://pb.test/api/collections/backups/records');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({
      user: 'user1', payload_version: 1, app_version: '1.15.0', card_count: 2,
    });
    expect((await backupService.getStatus()).lastBackupAt).not.toBeNull();
  });

  it('updates the existing backup in place without resending the user', async () => {
    await signedIn();
    mockFetch
      .mockResolvedValueOnce(json(200, { items: [{ id: 'b1' }] }))
      .mockResolvedValueOnce(json(200, { id: 'b1' }));

    await backupService.backUpNow();

    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('https://pb.test/api/collections/backups/records/b1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).not.toHaveProperty('user');
  });

  it('refuses non-Pro users before touching the network', async () => {
    await signedIn();
    mockPro.mockResolvedValue(false);

    await expect(backupService.backUpNow()).rejects.toMatchObject({ code: 'not_pro' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requires a signed-in account', async () => {
    await expect(backupService.backUpNow()).rejects.toMatchObject({ code: 'not_signed_in' });
  });

  it('reports offline without recording a success, and the next call can still run', async () => {
    await signedIn();
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(backupService.backUpNow()).rejects.toMatchObject({ code: 'offline' });
    expect((await backupService.getStatus()).lastBackupAt).toBeNull();

    mockFetch
      .mockResolvedValueOnce(json(200, { items: [] }))
      .mockResolvedValueOnce(json(200, { id: 'b1' }));
    await expect(backupService.backUpNow()).resolves.toBeDefined();
  });

  it('drops a rejected session so the UI asks to sign in again', async () => {
    await signedIn();
    mockFetch.mockResolvedValueOnce(json(401));

    await expect(backupService.backUpNow()).rejects.toMatchObject({ code: 'session_expired' });
    expect((await backupService.getStatus()).signedIn).toBe(false);
  });
});

describe('restore', () => {
  it('applies the downloaded payload and returns the summary', async () => {
    await signedIn();
    const summary = { restoredCards: 2, skippedCards: 0, addedWords: 0, restoredReviews: 3 };
    mockFetch.mockResolvedValueOnce(json(200, { items: [{ id: 'b1', payload_version: 1, payload: PAYLOAD }] }));
    mockRestore.mockResolvedValueOnce(summary);

    await expect(backupService.restore()).resolves.toEqual(summary);
    expect(mockRestore).toHaveBeenCalledWith({ fake: 'db' }, PAYLOAD);
  });

  it('reports no_backup when the account has none yet', async () => {
    await signedIn();
    mockFetch.mockResolvedValueOnce(json(200, { items: [] }));
    await expect(backupService.restore()).rejects.toMatchObject({ code: 'no_backup' });
    expect(mockRestore).not.toHaveBeenCalled();
  });

  it('refuses a backup from a newer app version without parsing it', async () => {
    await signedIn();
    mockFetch.mockResolvedValueOnce(json(200, { items: [{ id: 'b1', payload_version: 99, payload: {} }] }));
    await expect(backupService.restore()).rejects.toMatchObject({ code: 'unsupported_version' });
    expect(mockRestore).not.toHaveBeenCalled();
  });

  it('turns a corrupt payload into invalid_backup', async () => {
    await signedIn();
    mockFetch.mockResolvedValueOnce(json(200, { items: [{ id: 'b1', payload_version: 1, payload: {} }] }));
    mockRestore.mockRejectedValueOnce(new BackupPayloadError('invalid', 'bad'));
    await expect(backupService.restore()).rejects.toMatchObject({ code: 'invalid_backup' });
  });

  it('refuses non-Pro users', async () => {
    await signedIn();
    mockPro.mockResolvedValue(false);
    await expect(backupService.restore()).rejects.toMatchObject({ code: 'not_pro' });
  });
});

describe('maybeAutoBackup', () => {
  const NOW = Date.parse('2026-11-15T12:00:00Z');

  function mockSuccessfulUpload() {
    mockFetch
      .mockResolvedValueOnce(json(200, { items: [] }))
      .mockResolvedValueOnce(json(200, { id: 'b1' }));
  }

  it('does nothing when signed out', async () => {
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('backs up when signed in and nothing has been uploaded yet', async () => {
    await signedIn();
    mockSuccessfulUpload();
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(true);
  });

  it('skips when the last success is recent, runs again once the interval has passed', async () => {
    await signedIn();
    store.set(SETTINGS_KEYS.BACKUP_LAST_SUCCESS, new Date(NOW - AUTO_BACKUP_MIN_INTERVAL_MS + 60_000).toISOString());
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(false);

    store.set(SETTINGS_KEYS.BACKUP_LAST_SUCCESS, new Date(NOW - AUTO_BACKUP_MIN_INTERVAL_MS - 60_000).toISOString());
    mockSuccessfulUpload();
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(true);
  });

  it('respects the switch in settings', async () => {
    await signedIn();
    await backupService.setAutoBackupEnabled(false);
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not hammer the server after a failed attempt, and never throws', async () => {
    await signedIn();
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(false);

    mockFetch.mockClear();
    await expect(backupService.maybeAutoBackup(NOW + AUTO_BACKUP_RETRY_INTERVAL_MS - 1000)).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stays quiet for non-Pro users', async () => {
    await signedIn();
    mockPro.mockResolvedValue(false);
    await expect(backupService.maybeAutoBackup(NOW)).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('BackupError', () => {
  it('carries a code', () => {
    expect(new BackupError('offline').code).toBe('offline');
  });
});
