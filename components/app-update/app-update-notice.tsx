import { UpdateBanner } from '@/components/app-update/update-banner';
import { UpdateRequiredModal } from '@/components/app-update/update-required-modal';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useTranslation } from 'react-i18next';

/**
 * Renders the store-update notice, if there is one: a dismissible banner for
 * `available`, a blocking modal for `required`. Renders nothing otherwise
 * (offline, up to date, not a store build). Mount once, on the Home screen.
 */
export function AppUpdateNotice() {
  const { t } = useTranslation('app');
  const { update, dismiss, openStore } = useAppUpdate();

  if (!update) return null;

  const isRequired = update.status === 'required';
  const body =
    update.message ??
    t(isRequired ? 'app_update.body_required' : 'app_update.body_available', {
      version: update.latestVersion,
    });

  if (isRequired) {
    return (
      <UpdateRequiredModal
        visible
        title={t('app_update.title_required')}
        body={body}
        updateLabel={t('app_update.update')}
        onUpdate={openStore}
      />
    );
  }

  return (
    <UpdateBanner
      title={t('app_update.title_available')}
      body={body}
      updateLabel={t('app_update.update')}
      laterLabel={t('app_update.later')}
      dismissLabel={t('app_update.dismiss_label')}
      onUpdate={openStore}
      onDismiss={dismiss}
    />
  );
}
