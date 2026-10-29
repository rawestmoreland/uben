import { VerbPrepositionPatternList } from '@/components/quiz/verb-preposition-pattern-list';
import { QuizActionButton } from '@/components/quiz/quiz-action-button';
import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { useSettings } from '@/hooks/use-settings';
import { useVerbPrepositionPatterns } from '@/hooks/use-verb-preposition-patterns';
import { uiUpperCase } from '@/utils/uiText';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Verb Preposition Patterns ────────────────────────────────────────
//
// Cheat sheet for the preposition quiz: every pattern grouped by its
// preposition (that is how most learners memorize them), with the case, the
// sense, an example and the learner's mastery. Pro only, like the quiz.

function goBack() {
  router.back();
}

export default function VerbPrepositionPatternsScreen() {
  const { t } = useTranslation('app');
  const { phase, data } = useVerbPrepositionPatterns();
  const { eszettPreference } = useSettings();

  useEffect(() => {
    if (phase === 'locked') {
      router.replace({
        pathname: '/paywall',
        params: {
          redirectTo: '/verb-preposition-patterns',
          source: 'verb_preposition_patterns_entry',
        },
      });
    }
  }, [phase]);

  const hasPatterns = data !== null && data.patternCount > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.title}>
            {uiUpperCase(t('verb_preposition_patterns.title'))}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('verb_preposition_patterns.close')}
            hitSlop={12}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>
        </View>

        {(phase === 'loading' || phase === 'locked') && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.black} />
          </View>
        )}
        {phase === 'error' && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {t('verb_preposition_patterns.error')}
            </Text>
          </View>
        )}
        {phase === 'ready' && !hasPatterns && (
          <View style={styles.centered}>
            <View style={[styles.emptyCard, shadowStyle]}>
              <Text style={styles.emptyTitle}>
                {uiUpperCase(t('verb_preposition_patterns.empty_title'))}
              </Text>
              <Text style={styles.emptyText}>
                {t('verb_preposition_patterns.empty')}
              </Text>
            </View>
            <QuizActionButton label={t('back_to_home')} onPress={goBack} />
          </View>
        )}
        {phase === 'ready' && hasPatterns && (
          <VerbPrepositionPatternList
            data={data}
            eszettPreference={eszettPreference}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  container: {
    flex: 1,
    padding: Layout.screenPadding,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
