import { ReferenceRow } from '@/components/reference/reference-row';
import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { useProEntitlement } from '@/hooks/use-pro-entitlement';
import { uiUpperCase } from '@/utils/uiText';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Plain strings so the paywall can replay the route as its redirectTo after a
// purchase.
const PATTERNS_ROUTE = '/verb-preposition-patterns';
const PATTERNS_PAYWALL_SOURCE = 'verb_preposition_patterns_entry';

// ── Reference Tab ────────────────────────────────────────────────────
//
// Lookup tables and guides that are not exercises. Add new entries as
// <ReferenceRow> items below.

export default function ReferenceScreen() {
  const { t } = useTranslation('app');
  const { isPro } = useProEntitlement();

  // Pro only, like the preposition quiz it belongs to: a non-Pro tap goes
  // straight to the paywall instead of opening a screen that would bounce there.
  const openPrepositions = useCallback(() => {
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

  const openHowItWorks = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/how-it-works');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {uiUpperCase(t('reference_screen.title'))}
          </Text>
          <Text style={styles.headerSubtitle}>
            {uiUpperCase(t('reference_screen.subtitle'))}
          </Text>
        </View>

        <View style={styles.list}>
          <ReferenceRow
            title={t('home_screen.reference.prepositions.title')}
            subtitle={t('home_screen.reference.prepositions.subtitle')}
            accentColor={AppColors.pink}
            badge={isPro ? undefined : t('paywall.premium_badge')}
            onPress={openPrepositions}
          />
          <ReferenceRow
            title={t('how_it_works.title')}
            subtitle={t('how_it_works.subtitle')}
            accentColor={AppColors.green}
            onPress={openHowItWorks}
          />
        </View>
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
  headerTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },
  list: {
    gap: Spacing.lg,
  },
});
