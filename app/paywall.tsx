import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import { useProEntitlement } from '@/hooks/use-pro-entitlement';
import { purchaseService } from '@/services/purchaseService';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Paywall Screen ───────────────────────────────────────────────────

export default function PaywallScreen() {
  const { t } = useTranslation('app');
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const { refresh } = useProEntitlement();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToDestination() {
    if (redirectTo) {
      router.replace(redirectTo as any);
    } else {
      router.back();
    }
  }

  async function handleUnlock() {
    setError(null);
    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchaseService.purchasePro();
      if (result.success) {
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        goToDestination();
      } else if (!result.cancelled) {
        setError(result.error ?? t('paywall.purchase_failed'));
      }
    } catch (err) {
      console.error('[Paywall] Purchase failed:', err);
      setError(t('paywall.purchase_failed'));
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleRestore() {
    setError(null);
    setIsRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await purchaseService.restorePurchases();
      if (result.success) {
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        goToDestination();
      } else {
        setError(result.error ?? t('paywall.restore_failed'));
      }
    } catch (err) {
      console.error('[Paywall] Restore failed:', err);
      setError(t('paywall.restore_failed'));
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.close')}
          hitSlop={12}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>

        <View style={styles.content}>
          <View style={[styles.badgeCard, shadowStyle]}>
            <Text style={styles.badgeText}>
              {t('paywall.premium_badge').toUpperCase()}
            </Text>
          </View>

          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

          <View style={styles.featureList}>
            <FeatureRow text={t('paywall.feature_1')} />
            <FeatureRow text={t('paywall.feature_2')} />
            <FeatureRow text={t('paywall.feature_3')} />
            <FeatureRow text={t('paywall.feature_4')} />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.unlockButton,
              pressed && !isPurchasing && styles.unlockButtonPressed,
            ]}
            onPress={handleUnlock}
            disabled={isPurchasing || isRestoring}
            accessibilityRole="button"
            accessibilityLabel={t('paywall.unlock_button')}
          >
            {isPurchasing ? (
              <ActivityIndicator color={AppColors.black} />
            ) : (
              <Text style={styles.unlockButtonText}>
                {t('paywall.unlock_button').toUpperCase()}
              </Text>
            )}
          </Pressable>
          <Text style={styles.footnote}>{t('paywall.one_time_purchase')}</Text>
          <Pressable
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
            accessibilityRole="button"
            accessibilityLabel={t('paywall.restore_button')}
            hitSlop={8}
          >
            <Text style={styles.restoreText}>
              {isRestoring
                ? t('paywall.restoring')
                : t('paywall.restore_button')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureDot} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  container: {
    flex: 1,
    padding: Layout.screenPadding,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeCard: {
    backgroundColor: AppColors.purple,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  badgeText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
  },
  title: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  featureList: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.lg,
    ...shadowStyle,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  featureDot: {
    width: 10,
    height: 10,
    backgroundColor: AppColors.green,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    marginTop: 5,
    marginRight: Spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  errorText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.red,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    paddingTop: Spacing.lg,
  },
  unlockButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    ...shadowStyle,
  },
  unlockButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  unlockButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  footnote: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  restoreText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: Spacing.lg,
  },
});
