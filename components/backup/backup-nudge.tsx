import { UpdateBanner } from '@/components/app-update/update-banner';
import { useBackupNudge } from '@/hooks/use-backup-nudge';
import { useTranslation } from 'react-i18next';

/**
 * Dismissible card on Home telling Pro users that cloud backup exists.
 * Renders nothing for non-Pro users, people who already set it up, or anyone
 * who dismissed it. Reuses the store-update banner's look.
 */
export function BackupNudge() {
  const { t } = useTranslation('app');
  const { visible, dismiss, open } = useBackupNudge();

  if (!visible) return null;

  return (
    <UpdateBanner
      title={t('backup.nudge_title')}
      body={t('backup.nudge_body')}
      updateLabel={t('backup.nudge_action')}
      laterLabel={t('backup.nudge_later')}
      dismissLabel={t('backup.nudge_dismiss')}
      onUpdate={open}
      onDismiss={dismiss}
    />
  );
}
