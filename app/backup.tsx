import { BackupAuthForm } from '@/components/backup/backup-auth-form';
import { BackupButton } from '@/components/backup/backup-button';
import { BackupNoticeBanner } from '@/components/backup/backup-notice';
import { BackupPanel } from '@/components/backup/backup-panel';
import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import { useBackup } from '@/hooks/use-backup';
import { useProEntitlement } from '@/hooks/use-pro-entitlement';
import { uiUpperCase } from '@/utils/uiText';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKUP_PAYWALL_SOURCE = 'cloud_backup_entry';

function goBack() {
  router.back();
}

// ── Cloud Backup Screen ──────────────────────────────────────────────
// Pro only. Opened from Settings.

export default function BackupScreen() {
  const { t } = useTranslation('app');
  const { isPro, isLoading: proLoading } = useProEntitlement();
  const backup = useBackup();

  // No `redirectTo`: this screen is already in the stack, so the paywall just
  // goes back to it. Redirecting would stack a second copy of this screen on
  // top, leaving the first one (with stale sign-in state) underneath.
  const openPaywall = useCallback(() => {
    router.push({
      pathname: '/paywall',
      params: { source: BACKUP_PAYWALL_SOURCE },
    });
  }, []);

  const loading = proLoading || backup.status === null;
  const signedIn = backup.status?.signedIn ?? false;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Text style={styles.headerTitle}>
              {uiUpperCase(t('backup.title'))}
            </Text>
            <Pressable
              style={styles.closeButton}
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel={t('backup.close')}
              hitSlop={12}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </View>
          <Text style={styles.headerSubtitle}>{t('backup.row_subtitle')}</Text>
        </View>

        <View style={[styles.card, shadowStyle]}>
          {loading ? (
            <ActivityIndicator color={AppColors.black} />
          ) : (
            <>
              <BackupNoticeBanner notice={backup.notice} />
              {signedIn && backup.status ? (
                <BackupPanel
                  status={backup.status}
                  isPro={isPro}
                  remote={backup.remote}
                  busy={backup.busy}
                  onBackUp={backup.backUp}
                  onRestore={backup.restore}
                  onSignOut={backup.signOut}
                  onDeleteAccount={backup.deleteAccount}
                  onSetAutoBackup={backup.setAutoBackup}
                />
              ) : isPro ? (
                <>
                  <Text style={styles.body}>{t('backup.intro')}</Text>
                  <Text style={styles.body}>{t('backup.what_is_saved')}</Text>
                  <BackupAuthForm
                    busy={backup.busy}
                    onSignIn={backup.signIn}
                    onRegister={backup.register}
                    onRequestReset={backup.requestReset}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.body}>{t('backup.pro_required')}</Text>
                  <Text style={styles.body}>{t('backup.intro')}</Text>
                  <BackupButton
                    label={t('backup.unlock_pro')}
                    variant="primary"
                    onPress={openPaywall}
                  />
                </>
              )}
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  header: {
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
  },
  closeButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  card: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
  },
  body: {
    fontSize: Typography.body,
    color: AppColors.textPrimary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
});
