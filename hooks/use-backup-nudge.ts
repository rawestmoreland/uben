import { useProEntitlement } from '@/hooks/use-pro-entitlement';
import {
  dismissBackupNudge,
  getBackupNudgeState,
  shouldShowBackupNudge,
  type BackupNudgeState,
} from '@/services/backupNudge';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';

/**
 * State for the Home nudge to set up cloud backup. Re-checks on every focus,
 * so it disappears as soon as the user comes back from creating an account.
 */
export function useBackupNudge() {
  const { isPro, isLoading } = useProEntitlement();
  const [state, setState] = useState<BackupNudgeState | null>(null);

  useFocusEffect(
    useCallback(() => {
      getBackupNudgeState()
        .then(setState)
        .catch(() => undefined);
    }, []),
  );

  const dismiss = useCallback(() => {
    setState((current) => (current ? { ...current, dismissed: true } : current));
    dismissBackupNudge().catch(() => undefined);
  }, []);

  const open = useCallback(() => router.push('/backup'), []);

  return {
    visible: !isLoading && shouldShowBackupNudge({ isPro, state }),
    dismiss,
    open,
  };
}
