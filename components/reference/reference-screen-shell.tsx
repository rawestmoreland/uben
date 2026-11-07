import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ReferenceScreenShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function goBack() {
  router.back();
}

/** Shared frame for pushed Reference screens: title, close button, scroll body. */
export function ReferenceScreenShell({
  title,
  subtitle,
  children,
}: ReferenceScreenShellProps) {
  const { t } = useTranslation('app');
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Text style={styles.title}>{uiUpperCase(title)}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel={t('reference_screen.close')}
              hitSlop={12}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
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
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  subtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});
