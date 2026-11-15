import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type { BackupNotice } from '@/hooks/use-backup';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

/** Result of the last action: green for success, red with a plain-language reason for errors. */
export function BackupNoticeBanner({ notice }: { notice: BackupNotice | null }) {
  const { t } = useTranslation('app');
  if (!notice) return null;

  const isError = notice.type === 'error';
  const text = isError
    ? t(`backup.errors.${notice.code}`)
    : t(notice.key, notice.params);

  return (
    <View
      style={[styles.banner, isError ? styles.error : styles.success]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  success: {
    backgroundColor: AppColors.green,
  },
  error: {
    backgroundColor: AppColors.red,
  },
  text: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    lineHeight: 20,
  },
});
