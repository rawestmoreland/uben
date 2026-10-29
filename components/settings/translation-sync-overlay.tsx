import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import type { AppLanguage } from '@/types/language';
import { uiUpperCase } from '@/utils/uiText';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

interface TranslationSyncOverlayProps {
  /** Language being downloaded, or null when nothing is syncing. */
  language: AppLanguage | null;
}

/**
 * Blocking loading screen shown while a newly selected language's noun
 * translations download from PocketBase. The label is rendered in the language
 * being switched to, since the app UI hasn't switched over yet.
 */
export function TranslationSyncOverlay({ language }: TranslationSyncOverlayProps) {
  const { t } = useTranslation('app');

  return (
    <Modal visible={language !== null} transparent animationType="none">
      <View style={styles.backdrop}>
        <View style={[styles.card, shadowStyle]}>
          <ActivityIndicator size="large" color={AppColors.black} />
          <Text style={styles.label}>
            {language
              ? uiUpperCase(t('settings.translations_downloading', { lng: language }))
              : ''}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.screenPadding,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
  },
  label: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
