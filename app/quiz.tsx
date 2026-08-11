import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
  shadowStyleSmall,
} from '@/constants/design';
import { useNounTranslation } from '@/hooks/use-noun-translation';
import { useQuizInterstitialAd } from '@/hooks/use-quiz-interstitial-ad';
import {
  useQuizSession,
  type QuizMode,
  type QuizResult,
} from '@/hooks/use-quiz-session';
import { useSettings } from '@/hooks/use-settings';
import { useStoreReview } from '@/hooks/use-store-review';
import { applyGermanTextPreference } from '@/utils/germanText';
import { getNounFontSize } from '@/utils/typography';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { TFunction } from 'i18next';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Constants ────────────────────────────────────────────────────────

const ARTICLES = ['der', 'die', 'das'] as const;
type Article = (typeof ARTICLES)[number];
const FEEDBACK_DELAY_MS = 1200;

// Maps each article to its learning color:
// der (masculine) → blue, die (feminine) → pink, das (neuter) → green
function getArticleColor(article: Article): string {
  switch (article) {
    case 'der':
      return AppColors.blue;
    case 'die':
      return AppColors.pink;
    case 'das':
      return AppColors.green;
  }
}


// ── Quiz Screen ──────────────────────────────────────────────────────

export default function QuizScreen() {
  const { t } = useTranslation('app');
  const { mode } = useLocalSearchParams<{ mode?: QuizMode }>();
  const quiz = useQuizSession(mode ?? 'daily');
  const { phase, nextCard, results, progress } = quiz;
  const {
    showEnglishHint,
    eszettPreference,
  } = useSettings();

  // Auto-advance after feedback
  useEffect(() => {
    if (phase !== 'feedback') return;
    const timer = setTimeout(nextCard, FEEDBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, nextCard]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {phase === 'loading' && <LoadingState t={t} />}
      {phase === 'empty' && <EmptyState t={t} mode={quiz.mode} />}
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

function LoadingState({ t }: { t: TFunction }) {
  return (
    <View style={styles.centeredContainer}>
      <ActivityIndicator size="large" color={AppColors.black} />
      <Text style={styles.loadingText}>{t('quiz_mode.loading_cards')}</Text>
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────────

function EmptyState({ t, mode }: { t: TFunction; mode: QuizMode }) {
  const isStruggling = mode === 'struggling';
  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.emptyCard, shadowStyle]}>
        <Text style={styles.emptyTitle}>
          {isStruggling
            ? t('quiz_mode.no_struggling_words').toUpperCase()
            : t('quiz_mode.all_caught_up').toUpperCase()}
        </Text>
        <Text style={styles.emptySubtext}>
          {isStruggling
            ? t('quiz_mode.no_struggling_words_desc')
            : t('quiz_mode.no_cards_due_for_review')}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('back_to_home')}
      >
        <Text style={styles.backButtonText}>
          {t('back_to_home').toUpperCase()}
        </Text>
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
  const { t } = useTranslation('app');
  const { currentCard, phase, selectedArticle, isCorrect, progress, mode } =
    quiz;
  const translation = useNounTranslation(
    currentCard?.remote_id ?? null,
    currentCard?.english ?? null,
  );

  const isFeedback = phase === 'feedback';
  const isHomograph = currentCard ? currentCard.has_homograph_siblings === 1 : false;

  // Check if the user's wrong answer happens to be valid for a sibling noun.
  // Only meaningful for improper homographs (different articles).
  const siblingArticleSelected =
    isFeedback &&
    !isCorrect &&
    selectedArticle !== null &&
    currentCard !== null &&
    currentCard.sibling_articles !== null &&
    currentCard.sibling_articles.split(',').includes(selectedArticle);

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
      {/* ── Top row: close + mode badge ─────────────────────── */}
      <View style={styles.topRow}>
        {mode === 'struggling' && (
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {t('quiz_mode.hard_words_drill').toUpperCase()}
            </Text>
          </View>
        )}
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('quiz_mode.exit_quiz')}
          hitSlop={12}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>

      {/* ── Progress ────────────────────────────────────────── */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {t('quiz_mode.quiz_progress', {
            current: progress.current,
            total: progress.total,
          })}
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
            <Text
              style={[
                styles.wordText,
                { fontSize: getNounFontSize(currentCard.word) },
              ]}
            >
              <Text
                style={[
                  styles.articleReveal,
                  {
                    color: getArticleColor(currentCard.article as Article),
                    fontSize: getNounFontSize(currentCard.word),
                  },
                ]}
              >
                {currentCard.article}{' '}
              </Text>
              {applyGermanTextPreference(currentCard.word, eszettPreference)}
            </Text>
          ) : (
            <Text
              style={[
                styles.wordText,
                { fontSize: getNounFontSize(currentCard.word) },
              ]}
            >
              {applyGermanTextPreference(currentCard.word, eszettPreference)}
            </Text>
          )}
          {currentCard.sense && (
            <Text style={styles.senseHint}>
              ({t(`senses.${currentCard.sense}`, { defaultValue: currentCard.sense })})
            </Text>
          )}
          {/* Always show English for homographs so the learner knows which
              sense is being tested, even when the hint setting is off. */}
          {(showEnglishHint || isHomograph) && translation && (
            <Text style={styles.englishHint}>{translation}</Text>
          )}
          {/* Improper-homograph note: user picked the right article for the
              sibling word (different article, different meaning). */}
          {siblingArticleSelected && (
            <Text style={styles.siblingNote}>
              {t('quiz_mode.also_valid_for_sibling', {
                article: selectedArticle,
                word: currentCard.word,
              })}
            </Text>
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
            if (isFeedback && isCorrectAnswer) {
              buttonBg = getArticleColor(article);
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
                    isFeedback && isCorrectAnswer && { color: AppColors.white },
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
  const { t } = useTranslation('app');
  const { handleSessionComplete } = useStoreReview();
  const { maybeShowInterstitial } = useQuizInterstitialAd();

  // Request a review once per completed session, when conditions are met
  useEffect(() => {
    handleSessionComplete();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackToHome = () => {
    // Fire-and-forget: the interstitial (if shown) overlays natively, so
    // navigation doesn't need to wait on it.
    maybeShowInterstitial();
    router.back();
  };

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
        <Text style={styles.completeTitle}>
          {t('quiz_mode.session_complete').toUpperCase()}
        </Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>
              {t('quiz_mode.reviewed').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{correctCount}</Text>
            <Text style={styles.summaryLabel}>
              {t('quiz_mode.correct').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{accuracy}%</Text>
            <Text style={styles.summaryLabel}>
              {t('quiz_mode.accuracy').toUpperCase()}
            </Text>
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
                    backgroundColor: getArticleColor(result.correctArticle),
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
                  {t('quiz_mode.you_said', {
                    article: result.selectedArticle,
                  })}
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
          onPress={handleBackToHome}
          accessibilityRole="button"
          accessibilityLabel={t('back_to_home')}
        >
          <Text style={styles.backButtonText}>
            {t('back_to_home').toUpperCase()}
          </Text>
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

  // Top row (close + mode badge)
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeBadge: {
    backgroundColor: AppColors.red,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  modeBadgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
  },

  // Close button
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
  senseHint: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  englishHint: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
  },
  siblingNote: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.blue,
    marginTop: Spacing.sm,
    textAlign: 'center',
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
    color: AppColors.textSecondary,
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
