import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { redeemCode } from '@/services/promoCodeService';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface PromoCodeFormProps {
  /** Called after a successful redemption (Pro is already unlocked locally). */
  onRedeemed: () => void;
  onCancel: () => void;
}

export function PromoCodeForm({ onRedeemed, onCancel }: PromoCodeFormProps) {
  const { t } = useTranslation('app');
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = useCallback(async () => {
    setError(null);
    setIsRedeeming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await redeemCode(code);
    setIsRedeeming(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRedeemed();
    } else {
      setError(t(`paywall.promo_error_${result.reason ?? 'invalid'}`));
    }
  }, [code, onRedeemed, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('paywall.promo_title').toUpperCase()}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder={t('paywall.promo_placeholder')}
        placeholderTextColor={AppColors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!isRedeeming}
        accessibilityLabel={t('paywall.promo_title')}
        onSubmitEditing={handleRedeem}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.actions}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isRedeeming}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.promo_cancel')}
        >
          <Text style={styles.buttonText}>
            {t('paywall.promo_cancel').toUpperCase()}
          </Text>
        </Pressable>
        <Pressable
          style={styles.redeemButton}
          onPress={handleRedeem}
          disabled={isRedeeming || code.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.promo_redeem')}
        >
          {isRedeeming ? (
            <ActivityIndicator color={AppColors.black} />
          ) : (
            <Text style={styles.buttonText}>
              {t('paywall.promo_redeem').toUpperCase()}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.md,
  },
  label: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.md,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  errorText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.red,
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButton: {
    flex: 1,
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
