import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import type { PluralQuizResult } from '@/hooks/use-plural-quiz-session';
import { useQuizInterstitialAd } from '@/hooks/use-quiz-interstitial-ad';
import { useStoreReview } from '@/hooks/use-store-review';
import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PluralResultRow } from './plural-result-row';
import { QuizActionButton } from './quiz-action-button';
import { uiUpperCase } from '@/utils/uiText';

function resultKey(result: PluralQuizResult): string {
  return String(result.card.word_id);
}

interface PluralQuizResultsProps {
  results: PluralQuizResult[];
  eszettPreference: 'eszett' | 'ss';
}

/** End-of-session summary: totals, then every noun with its plural and ending. */
export function PluralQuizResults({
  results,
  eszettPreference,
}: PluralQuizResultsProps) {
  const { t } = useTranslation('app');
  const { handleSessionComplete } = useStoreReview();
  const { maybeShowInterstitial } = useQuizInterstitialAd();

  useEffect(() => {
    handleSessionComplete();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Interstitials only ever show between sessions, never mid-quiz
  const handleBackToHome = useCallback(() => {
    maybeShowInterstitial();
    router.back();
  }, [maybeShowInterstitial]);

  const renderResult = useCallback(
    ({ item }: { item: PluralQuizResult }) => (
      <PluralResultRow result={item} eszettPreference={eszettPreference} />
    ),
    [eszettPreference],
  );

  const correctCount = results.filter((result) => result.isCorrect).length;
  const accuracy =
    results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  const summary = [
    { label: t('quiz_mode.reviewed'), value: String(results.length) },
    { label: t('quiz_mode.correct'), value: String(correctCount) },
    { label: t('quiz_mode.accuracy'), value: `${accuracy}%` },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={resultKey}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>
              {uiUpperCase(t('quiz_mode.session_complete'))}
            </Text>
            <View style={styles.summaryRow}>
              {summary.map(({ label, value }) => (
                <View key={label} style={[styles.summaryCard, shadowStyleSmall]}>
                  <Text style={styles.summaryValue}>{value}</Text>
                  <Text style={styles.summaryLabel}>{uiUpperCase(label)}</Text>
                </View>
              ))}
            </View>
          </>
        }
        renderItem={renderResult}
      />

      <View style={styles.footer}>
        <QuizActionButton label={t('back_to_home')} onPress={handleBackToHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.screenPadding, paddingBottom: Spacing.xl },
  title: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  summaryLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  footer: {
    backgroundColor: AppColors.cream,
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.black,
  },
});
