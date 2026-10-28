import { QuizActionButton } from '@/components/quiz/quiz-action-button';
import { VerbPrepositionQuizPlay } from '@/components/quiz/verb-preposition-quiz-play';
import { VerbPrepositionQuizResults } from '@/components/quiz/verb-preposition-quiz-results';
import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import {
  useVerbPrepositionQuizSession,
  type VerbPrepositionQuizMode,
} from '@/hooks/use-verb-preposition-quiz-session';
import { uiUpperCase } from '@/utils/uiText';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Verb Preposition Quiz ────────────────────────────────────────────
//
// The learner sees a cloze sentence ("Ich warte ____ meine Frau.") and picks
// the preposition from a fixed grid. Feedback shows the full pattern with its
// case ("warten auf + Akk."). Pro only, with no metered free trial: the home
// tile routes non-Pro users to the paywall, and the session hook reports a
// 'locked' phase as a defensive gate for direct/deep links.
//
// `?mode=pronouns` asks the same patterns as da(r)-/wo(r)- forms instead
// ("Ich warte ____." -> darauf, "____ wartest du?" -> Worauf).

function goBack() {
  router.back();
}

function openPatterns() {
  router.push('/verb-preposition-patterns');
}

export default function VerbPrepositionQuizScreen() {
  const { t } = useTranslation('app');
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: VerbPrepositionQuizMode =
    params.mode === 'pronouns' ? 'pronouns' : 'patterns';
  const quiz = useVerbPrepositionQuizSession(mode);
  const { phase } = quiz;

  useEffect(() => {
    if (phase === 'locked') {
      router.replace({
        pathname: '/paywall',
        params: {
          redirectTo:
            mode === 'pronouns'
              ? '/verb-preposition-quiz?mode=pronouns'
              : '/verb-preposition-quiz',
          source:
            mode === 'pronouns'
              ? 'verb_preposition_pronoun_quiz_entry'
              : 'verb_preposition_quiz_entry',
        },
      });
    }
  }, [phase, mode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {(phase === 'loading' || phase === 'locked') && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.black} />
          <Text style={styles.loadingText}>{t('quiz_mode.loading_cards')}</Text>
        </View>
      )}
      {phase === 'empty' && (
        <View style={styles.centered}>
          <View style={[styles.emptyCard, shadowStyle]}>
            <Text style={styles.emptyTitle}>
              {uiUpperCase(t('verb_preposition_quiz.all_caught_up'))}
            </Text>
            <Text style={styles.emptyText}>
              {t('verb_preposition_quiz.no_cards_due')}
            </Text>
          </View>
          <View style={styles.buttonGap}>
            <QuizActionButton
              label={t('verb_preposition_patterns.open')}
              onPress={openPatterns}
            />
          </View>
          <QuizActionButton label={t('back_to_home')} onPress={goBack} />
        </View>
      )}
      {(phase === 'playing' || phase === 'case' || phase === 'feedback') && (
        <VerbPrepositionQuizPlay quiz={quiz} mode={mode} />
      )}
      {phase === 'complete' && (
        <VerbPrepositionQuizResults results={quiz.results} />
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
  buttonGap: {
    alignSelf: 'stretch',
    marginBottom: Spacing.md,
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
