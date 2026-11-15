import { BackupButton } from '@/components/backup/backup-button';
import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type { BackupAction } from '@/hooks/use-backup';
import type { BackupStatus, RemoteBackupInfo } from '@/services/backupService';
import { formatBackupTime } from '@/utils/backupTime';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

interface BackupPanelProps {
  status: BackupStatus;
  /** Backup and restore are Pro features; account actions stay available without Pro. */
  isPro: boolean;
  /** undefined = unknown (offline or still loading), null = nothing in the cloud. */
  remote: RemoteBackupInfo | null | undefined;
  busy: BackupAction | null;
  onBackUp: () => void;
  onRestore: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onSetAutoBackup: (enabled: boolean) => void;
}

/** Signed-in view: what is backed up, back up / restore, automatic backup, account actions. */
export function BackupPanel({
  status,
  isPro,
  remote,
  busy,
  onBackUp,
  onRestore,
  onSignOut,
  onDeleteAccount,
  onSetAutoBackup,
}: BackupPanelProps) {
  const { t } = useTranslation('app');

  // Restore overwrites matching local cards, so it always asks first.
  const confirmRestore = useCallback(() => {
    Alert.alert(
      t('backup.restore_confirm_title'),
      t('backup.restore_confirm_body'),
      [
        { text: t('backup.cancel'), style: 'cancel' },
        { text: t('backup.restore'), onPress: onRestore },
      ],
    );
  }, [t, onRestore]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      t('backup.delete_confirm_title'),
      t('backup.delete_confirm_body'),
      [
        { text: t('backup.cancel'), style: 'cancel' },
        {
          text: t('backup.delete_confirm_button'),
          style: 'destructive',
          onPress: onDeleteAccount,
        },
      ],
    );
  }, [t, onDeleteAccount]);

  const working = busy !== null;
  const actionsLocked = working || !isPro;
  const localLine = status.lastBackupAt
    ? t('backup.last_backup', { when: formatBackupTime(status.lastBackupAt) })
    : t('backup.no_local_backup');

  let cloudLine: string | null = null;
  if (remote) {
    cloudLine = t('backup.cloud_backup', {
      when: formatBackupTime(remote.updatedAt),
      cards: remote.cardCount,
    });
  } else if (remote === null) {
    cloudLine = t('backup.no_cloud_backup');
  }

  return (
    <View>
      <Text style={styles.account}>
        {t('backup.signed_in_as', { email: status.email })}
      </Text>
      <Text style={styles.line}>{localLine}</Text>
      {cloudLine && <Text style={styles.line}>{cloudLine}</Text>}
      {!isPro && <Text style={styles.proNote}>{t('backup.errors.not_pro')}</Text>}

      <View style={styles.actions}>
        <BackupButton
          label={busy === 'back_up' ? t('backup.backing_up') : t('backup.back_up_now')}
          variant="primary"
          onPress={onBackUp}
          loading={busy === 'back_up'}
          disabled={actionsLocked}
        />
        <BackupButton
          label={busy === 'restore' ? t('backup.restoring') : t('backup.restore')}
          onPress={confirmRestore}
          loading={busy === 'restore'}
          disabled={actionsLocked || remote === null}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchLabel}>{t('backup.auto_backup')}</Text>
          <Text style={styles.line}>{t('backup.auto_backup_description')}</Text>
        </View>
        <Switch
          value={status.autoBackupEnabled}
          onValueChange={onSetAutoBackup}
          trackColor={{ false: AppColors.lightGray, true: AppColors.yellow }}
          thumbColor={AppColors.white}
          style={styles.switch}
        />
      </View>

      <BackupButton label={t('backup.sign_out')} onPress={onSignOut} disabled={working} />
      <BackupButton
        label={t('backup.delete_account')}
        variant="danger"
        onPress={confirmDelete}
        loading={busy === 'delete'}
        disabled={working}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  account: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    marginBottom: Spacing.sm,
  },
  line: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  proNote: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.red,
    lineHeight: 20,
  },
  actions: {
    marginTop: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.lightGray,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  switchText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    marginBottom: Spacing.xs,
  },
  switch: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    borderRadius: 16,
  },
});
