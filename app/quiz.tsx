import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useQuizSession,
  type QuizResult,
} from '@/hooks/use-quiz-session';
import { useSettings } from '@/hooks/use-settings';
import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
  shadowStyleSmall,
} from '@/constants/design';
import { applyGermanTextPreference } from '@/utils/germanText';

// ── Constants ────────────────────────────────────────────────────────

const ARTICLES = ['der', 'die', 'das'] as const;
type Article = (typeof ARTICLES)[number];
const FEEDBACK_DELAY_MS = 1200;

// ── Quiz Screen ──────────────────────────────────────────────────────

export default function QuizScreen() {
  const quiz = useQuizSession();
  const { phase, nextCard, results } = quiz;
  const { showEnglishHint, eszettPreference } = useSettings();

  // Auto-advance after feedback
  useEffect(() => {
    if (phase !== 'feedback') return;

    const timer = setTimeout(() => {
      nextCard();
    }, FEEDBACK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [phase, nextCard]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {phase === 'loading' && <LoadingState />}
      {phase === 'empty' && <EmptyState />}
      {(phase === 'playing' || phase === 'feedback') && (
        <PlayingState
          quiz={quiz}
          showEnglishHint={showEnglishHint}
          eszettPreference={eszettPreference}
        />
      )}
      {phase === 'complete' && (
        <CompleteState results={results} eszettPreference={eszettPreference} />
      )}
    </SafeAreaView>
  );
}

// ── Loading State ────────────────────────────────────────────────────

function LoadingState() {
  return (
    <View style={styles.centeredContainer}>
      <ActivityIndicator size="large" color={AppColors.black} />
      <Text style={styles.loadingText}>Loading cards...</Text>
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.emptyCard, shadowStyle]}>
        <Text style={styles.emptyTitle}>ALL CAUGHT UP</Text>
        <Text style={styles.emptySubtext}>
          No cards due for review right now.{'\n\n'}
          Try selecting different categories or come back later!
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to home"
      >
        <Text style={styles.backButtonText}>BACK TO HOME</Text>
      </Pressable>
    </View>
  );
}

// ── Playing State ────────────────────────────────────────────────────

interface PlayingStateProps {
  quiz: ReturnType<typeof useQuizSession>;
  showEnglishHint: boolean;
  eszettPreference: 'eszett' | 'ss';
}

function PlayingState({
  quiz,
  showEnglishHint,
  eszettPreference,
}: PlayingStateProps) {
  const { currentCard, phase, selectedArticle, isCorrect, progress } = quiz;

  const isFeedback = phase === 'feedback';

  // Fire haptic on feedback (must be before any early return)
  useEffect(() => {
    if (!isFeedback) return;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isFeedback, isCorrect]);

  if (!currentCard) return null;

  function handleAnswer(article: Article) {
    if (isFeedback) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    quiz.submitAnswer(article);
  }

  return (
    <View style={styles.playingContainer}>
      {/* ── Close button ────────────────────────────────────── */}
      <Pressable
        style={styles.closeButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Exit quiz"
        hitSlop={12}
      >
        <Text style={styles.closeButtonText}>X</Text>
      </Pressable>

      {/* ── Progress ────────────────────────────────────────── */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {progress.current} of {progress.total}
        </Text>
        <View style={styles.progressBarOuter}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* ── Word Card ───────────────────────────────────────── */}
      <View style={styles.wordSection}>
        <View style={[styles.wordCard, shadowStyle]}>
          {isFeedback ? (
            <Text style={styles.wordText}>
              <Text
                style={[
                  styles.articleReveal,
                  { color: isCorrect ? AppColors.green : AppColors.red },
                ]}
              >
                {currentCard.article}{' '}
              </Text>
              {applyGermanTextPreference(currentCard.word, eszettPreference)}
            </Text>
          ) : (
            <Text style={styles.wordText}>
              {applyGermanTextPreference(currentCard.word, eszettPreference)}
            </Text>
          )}
          {showEnglishHint && currentCard.english && (
            <Text style={styles.englishHint}>{currentCard.english}</Text>
          )}
        </View>
      </View>

      {/* ── Article Buttons ─────────────────────────────────── */}
      <View style={styles.articlesSection}>
        <View style={styles.articlesRow}>
          {ARTICLES.map((article) => {
            const isSelected = selectedArticle === article;
            const isCorrectAnswer = currentCard.article === article;

            let buttonBg: string = AppColors.white;
            if (isFeedback) {
              if (isCorrectAnswer) {
                buttonBg = AppColors.green;
              } else if (isSelected && !isCorrect) {
                buttonBg = AppColors.red;
              }
            }

            return (
              <Pressable
                key={article}
                style={({ pressed }) => [
                  styles.articleButton,
                  shadowStyleSmall,
                  { backgroundColor: buttonBg },
                  pressed && !isFeedback && styles.articleButtonPressed,
                ]}
                onPress={() => handleAnswer(article)}
                disabled={isFeedback}
                accessibilityRole="button"
                accessibilityLabel={`Select ${article}`}
              >
                <Text
                  style={[
                    styles.articleButtonText,
                    isFeedback &&
                      (isCorrectAnswer || isSelected) && {
                        color: AppColors.white,
                      },
                  ]}
                >
                  {article}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Complete State ───────────────────────────────────────────────────

interface CompleteStateProps {
  results: QuizResult[];
  eszettPreference: 'eszett' | 'ss';
}

function CompleteState({ results, eszettPreference }: CompleteStateProps) {
  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <View style={styles.completeContainer}>
      <ScrollView
        style={styles.completeScroll}
        contentContainerStyle={styles.completeContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary header ──────────────────────────────────── */}
        <Text style={styles.completeTitle}>SESSION COMPLETE</Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>REVIEWED</Text>
          </View>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{correctCount}</Text>
            <Text style={styles.summaryLabel}>CORRECT</Text>
          </View>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{accuracy}%</Text>
            <Text style={styles.summaryLabel}>ACCURACY</Text>
          </View>
        </View>

        {/* ── Results list ────────────────────────────────────── */}
        <View style={styles.resultsList}>
          {results.map((result, index) => (
            <View key={index} style={styles.resultRow}>
              <View
                style={[
                  styles.resultIndicator,
                  {
                    backgroundColor: result.isCorrect
                      ? AppColors.green
                      : AppColors.red,
                  },
                ]}
              />
              <Text style={styles.resultWord}>
                <Text style={styles.resultArticle}>
                  {result.correctArticle}{' '}
                </Text>
                {applyGermanTextPreference(result.card.word, eszettPreference)}
              </Text>
              {!result.isCorrect && (
                <Text style={styles.resultYourAnswer}>
                  you said: {result.selectedArticle}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Floating back button ────────────────────────────── */}
      <View style={styles.floatingButtonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={styles.backButtonText}>BACK TO HOME</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },

  // ── Centered (loading, empty) ────────────────────────────────────
  centeredContainer: {
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

  // ── Empty state ──────────────────────────────────────────────────
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
  emptySubtext: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },

  // ── Playing state ────────────────────────────────────────────────
  playingContainer: {
    flex: 1,
    padding: Layout.screenPadding,
  },

  // Close button
  closeButton: {
    alignSelf: 'flex-end',
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

  // Progress
  progressSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  progressBarOuter: {
    height: 12,
    backgroundColor: AppColors.lightGray,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.green,
  },

  // Word card
  wordSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  wordText: {
    fontSize: Typography.huge,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  articleReveal: {
    fontSize: Typography.huge,
    fontWeight: Typography.bold,
  },
  englishHint: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
  },

  // Article buttons
  articlesSection: {
    paddingBottom: Spacing.lg,
  },
  articlesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  articleButton: {
    flex: 1,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  articleButtonPressed: {
    transform: [{ translateY: 2 }],
    backgroundColor: AppColors.blue,
  },
  articleButtonText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },

  // ── Complete state ───────────────────────────────────────────────
  completeContainer: {
    flex: 1,
  },
  completeScroll: {
    flex: 1,
  },
  completeContent: {
    padding: Layout.screenPadding,
    paddingBottom: 100, // Extra space for floating button (64px button + spacing)
  },
  floatingButtonContainer: {
    backgroundColor: AppColors.cream,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.black,
  },
  completeTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },

  // Results list
  resultsList: {
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    marginBottom: Spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: Layout.borderWidthThin,
    borderBottomColor: AppColors.lightGray,
  },
  resultIndicator: {
    width: 12,
    height: 12,
    marginRight: Spacing.md,
  },
  resultWord: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  resultArticle: {
    fontWeight: Typography.bold,
  },
  resultYourAnswer: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.red,
  },

  // Back button (shared)
  backButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    ...shadowStyle,
  },
  backButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  backButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
