import { AppColors, Layout, Typography } from '@/constants/design';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { uiUpperCase } from '@/utils/uiText';

/** Small chip marking a Üben Pro member. Render only when `isPro` is true. */
export function ProBadge() {
  const { t } = useTranslation('app');

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{uiUpperCase(t('pro_badge'))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
});
