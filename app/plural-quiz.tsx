import { PluralQuizPlay } from '@/components/quiz/plural-quiz-play';
import { PluralQuizResults } from '@/components/quiz/plural-quiz-results';
import { QuizActionButton } from '@/components/quiz/quiz-action-button';
import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { usePluralQuizSession } from '@/hooks/use-plural-quiz-session';
import { useSettings } from '@/hooks/use-settings';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Plural Ending Quiz ───────────────────────────────────────────────
//
// The learner sees "das Kind ___" and picks one of nine fixed ending
// buttons. The correct ending is derived from the noun's stored plural
// (see pluralService); nouns whose plural doesn't fit a button never
// appear. Free for everyone, launched from the home "Plurals" tile via
// select-categories.

function goBack() {
  router.back();
}

export default function PluralQuizScreen() {
  const { t } = useTranslation('app');
  const quiz = usePluralQuizSession();
  const { showEnglishHint, eszettPreference } = useSettings();
  const { phase } = quiz;

  return (
    <SafeAreaView style={styles.safeArea}>
      {phase === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.black} />
          <Text style={styles.loadingText}>{t('quiz_mode.loading_cards')}</Text>
        </View>
      )}
      {phase === 'empty' && (
        <View style={styles.centered}>
          <View style={[styles.emptyCard, shadowStyle]}>
            <Text style={styles.emptyTitle}>
              {t('plural_quiz.all_caught_up').toUpperCase()}
            </Text>
            <Text style={styles.emptyText}>{t('plural_quiz.no_cards_due')}</Text>
          </View>
          <QuizActionButton label={t('back_to_home')} onPress={goBack} />
        </View>
      )}
      {(phase === 'playing' || phase === 'feedback') && (
        <PluralQuizPlay
          quiz={quiz}
          showEnglishHint={showEnglishHint}
          eszettPreference={eszettPreference}
        />
      )}
      {phase === 'complete' && (
        <PluralQuizResults
          results={quiz.results}
          eszettPreference={eszettPreference}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  emptyCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
