import {
  deleteAccount,
  register,
  requestPasswordReset,
  signIn,
  signOut,
} from '@/services/backupAccountService';
import { BackupError, type BackupErrorCode } from '@/services/backupApi';
import {
  backupService,
  type BackupStatus,
  type RemoteBackupInfo,
} from '@/services/backupService';
import type { RestoreSummary } from '@/types/backup';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';

export type BackupAction =
  | 'sign_in'
  | 'register'
  | 'reset'
  | 'back_up'
  | 'restore'
  | 'delete';

/** What the screen shows after an action: a translation key + params, or an error code. */
export type BackupNotice =
  | { type: 'success'; key: string; params?: Record<string, string | number> }
  | { type: 'error'; code: BackupErrorCode | 'unknown' };

function restoreNotice(summary: RestoreSummary): BackupNotice {
  if (summary.skippedCards > 0) {
    return {
      type: 'success',
      key: 'backup.restored_skipped',
      params: { restored: summary.restoredCards, skipped: summary.skippedCards },
    };
  }
  return {
    type: 'success',
    key: 'backup.restored',
    params: { restored: summary.restoredCards },
  };
}

/**
 * State and actions for the cloud-backup screen. All the work lives in the
 * services; this only tracks what the screen needs (status, what is in the
 * cloud, which action is running, the last result).
 */
export function useBackup() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  // undefined = not loaded yet or unavailable, null = nothing in the cloud
  const [remote, setRemote] = useState<RemoteBackupInfo | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState<BackupAction | null>(null);
  const [notice, setNotice] = useState<BackupNotice | null>(null);

  const refresh = useCallback(async () => {
    const next = await backupService.getStatus();
    setStatus(next);
    if (!next.signedIn) {
      setRemote(undefined);
      return;
    }
    try {
      setRemote(await backupService.getRemoteBackupInfo());
    } catch (error) {
      // Offline or expired: the panel still works, it just can't show cloud info.
      setRemote(undefined);
      if (error instanceof BackupError && error.code === 'session_expired') {
        setStatus(await backupService.getStatus());
        setNotice({ type: 'error', code: 'session_expired' });
      }
    }
  }, []);

  // On every focus, not just mount: coming back from the paywall (or any other
  // screen) must not show sign-in state from before.
  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  /** Run an action: busy flag, then a success or error notice, then refresh. */
  const run = useCallback(
    async <T,>(
      action: BackupAction,
      task: () => Promise<T>,
      onSuccess: (result: T) => BackupNotice | null,
    ) => {
      setBusy(action);
      setNotice(null);
      try {
        setNotice(onSuccess(await task()));
      } catch (error) {
        setNotice({
          type: 'error',
          code: error instanceof BackupError ? error.code : 'unknown',
        });
      } finally {
        setBusy(null);
        await refresh().catch(() => undefined);
      }
    },
    [refresh],
  );

  const doSignIn = useCallback(
    (email: string, password: string) =>
      run('sign_in', () => signIn(email, password), () => null),
    [run],
  );
  const doRegister = useCallback(
    (email: string, password: string) =>
      run('register', () => register(email, password), () => null),
    [run],
  );
  const doReset = useCallback(
    (email: string) =>
      run('reset', () => requestPasswordReset(email), () => ({
        type: 'success',
        key: 'backup.reset_sent',
      })),
    [run],
  );
  const doBackUp = useCallback(
    () =>
      run('back_up', () => backupService.backUpNow(), (result) => ({
        type: 'success',
        key: 'backup.backed_up',
        params: { cards: result.cardCount },
      })),
    [run],
  );
  const doRestore = useCallback(
    () => run('restore', () => backupService.restore(), restoreNotice),
    [run],
  );
  const doDelete = useCallback(
    () => run('delete', () => deleteAccount(), () => null),
    [run],
  );
  const doSignOut = useCallback(async () => {
    setNotice(null);
    await signOut();
    await refresh();
  }, [refresh]);

  const setAutoBackup = useCallback(
    async (enabled: boolean) => {
      await backupService.setAutoBackupEnabled(enabled);
      await refresh();
    },
    [refresh],
  );

  return {
    status,
    remote,
    busy,
    notice,
    signIn: doSignIn,
    register: doRegister,
    requestReset: doReset,
    backUp: doBackUp,
    restore: doRestore,
    deleteAccount: doDelete,
    signOut: doSignOut,
    setAutoBackup,
  };
}
