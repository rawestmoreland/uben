import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { useProEntitlement } from '@/hooks/use-pro-entitlement';
import { uiUpperCase } from '@/utils/uiText';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// The cheat sheet is a lookup, not an exercise, so it lives outside the
// practice tiles. The route is a plain string so the paywall can replay it as
// its redirectTo after a purchase.
const PATTERNS_ROUTE = '/verb-preposition-patterns';
const PATTERNS_PAYWALL_SOURCE = 'verb_preposition_patterns_entry';

/**
 * Home-screen "Reference" section: opens lookup tables without starting a
 * quiz. Pro only, like the preposition quiz it belongs to; a non-Pro tap goes
 * straight to the paywall instead of opening a screen that would bounce there.
 */
export function ReferenceSection() {
  const { t } = useTranslation('app');
  const { isPro } = useProEntitlement();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isPro) {
      router.push({
        pathname: '/paywall',
        params: {
          redirectTo: PATTERNS_ROUTE,
          source: PATTERNS_PAYWALL_SOURCE,
        },
      });
      return;
    }
    router.push(PATTERNS_ROUTE);
  }, [isPro]);

  const title = t('home_screen.reference.prepositions.title');

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('home_screen.reference_label')}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          shadowStyleSmall,
          pressed && styles.rowPressed,
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.accentStrip} />
        <View style={styles.body}>
          <View style={styles.textGroup}>
            <Text style={styles.title}>{uiUpperCase(title)}</Text>
            <Text style={styles.subtitle}>
              {t('home_screen.reference.prepositions.subtitle')}
            </Text>
          </View>
          {!isPro && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {uiUpperCase(t('paywall.premium_badge'))}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    minHeight: 64,
  },
  rowPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  accentStrip: {
    width: 8,
    backgroundColor: AppColors.pink,
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  badge: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  badgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
});
