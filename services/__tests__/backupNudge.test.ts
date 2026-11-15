import { signIn } from '../backupAccountService';
import {
  BACKUP_NUDGE_MIN_SESSIONS,
  dismissBackupNudge,
  getBackupNudgeState,
  shouldShowBackupNudge,
} from '../backupNudge';
import { SETTINGS_KEYS, settingsService } from '../settingsService';

jest.mock('@/constants/pocketbase', () => ({
  PB_URL: 'https://pb.test',
  PB_API_KEY: 'app-key',
}));
jest.mock('@/database/db', () => ({ getDatabase: () => ({}) }));

const NOT_SET_UP = {
  signedIn: false,
  dismissed: false,
  sessionsCompleted: BACKUP_NUDGE_MIN_SESSIONS,
};

describe('shouldShowBackupNudge', () => {
  it('shows for a Pro user with no account who has not dismissed it', () => {
    expect(shouldShowBackupNudge({ isPro: true, state: NOT_SET_UP, platform: 'ios' })).toBe(true);
    expect(shouldShowBackupNudge({ isPro: true, state: NOT_SET_UP, platform: 'android' })).toBe(true);
  });

  it('waits until a few sessions are done', () => {
    const early = { ...NOT_SET_UP, sessionsCompleted: BACKUP_NUDGE_MIN_SESSIONS - 1 };
    expect(shouldShowBackupNudge({ isPro: true, state: early, platform: 'ios' })).toBe(false);
    const ready = { ...NOT_SET_UP, sessionsCompleted: BACKUP_NUDGE_MIN_SESSIONS };
    expect(shouldShowBackupNudge({ isPro: true, state: ready, platform: 'ios' })).toBe(true);
  });

  it('never shows for non-Pro users', () => {
    expect(shouldShowBackupNudge({ isPro: false, state: NOT_SET_UP, platform: 'ios' })).toBe(false);
  });

  it('hides once signed in or dismissed', () => {
    expect(shouldShowBackupNudge({ isPro: true, state: { ...NOT_SET_UP, signedIn: true }, platform: 'ios' })).toBe(false);
    expect(shouldShowBackupNudge({ isPro: true, state: { ...NOT_SET_UP, dismissed: true }, platform: 'ios' })).toBe(false);
  });

  it('waits until the state has loaded, and never shows on web', () => {
    expect(shouldShowBackupNudge({ isPro: true, state: null, platform: 'ios' })).toBe(false);
    expect(shouldShowBackupNudge({ isPro: true, state: NOT_SET_UP, platform: 'web' })).toBe(false);
  });
});

describe('nudge state', () => {
  let store: Map<string, string>;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = mockFetch;
    store = new Map();
    jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key) => store.get(key) ?? null);
    jest.spyOn(settingsService, 'setSetting').mockImplementation(async (key, value) => {
      store.set(key, value);
    });
  });

  it('starts as not set up, with no sessions', async () => {
    await expect(getBackupNudgeState()).resolves.toEqual({
      signedIn: false,
      dismissed: false,
      sessionsCompleted: 0,
    });
  });

  it('reads the completed-session counter, ignoring a corrupt value', async () => {
    store.set(SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED, '7');
    expect((await getBackupNudgeState()).sessionsCompleted).toBe(7);
    store.set(SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED, 'oops');
    expect((await getBackupNudgeState()).sessionsCompleted).toBe(0);
  });

  it('remembers a dismissal', async () => {
    await dismissBackupNudge();
    expect((await getBackupNudgeState()).dismissed).toBe(true);
  });

  it('stays hidden after the user signs in and later signs out', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ token: 't', record: { id: 'u1', email: 'a@test.dev' } }),
    });
    await signIn('a@test.dev', 'password123');
    expect(store.get(SETTINGS_KEYS.BACKUP_NUDGE_DISMISSED)).toBe('true');

    store.set(SETTINGS_KEYS.BACKUP_ACCOUNT, ''); // signed out
    store.set(SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED, '50');
    const state = await getBackupNudgeState();
    expect(shouldShowBackupNudge({ isPro: true, state, platform: 'ios' })).toBe(false);
  });
});
