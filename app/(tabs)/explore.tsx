import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
  shadowStyleSmall,
} from '@/constants/design';

// ── About Screen ─────────────────────────────────────────────────────

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>HOW IT WORKS</Text>
          <Text style={styles.headerSubtitle}>SCIENCE-BACKED LEARNING</Text>
        </View>

        {/* ── Section 1: What is Spaced Repetition? ───────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>WHAT IS SPACED REPETITION?</Text>
          <Text style={styles.cardBody}>
            Instead of cramming all at once, you review each word right before
            you would forget it. Every time you answer correctly, the gap until
            the next review gets longer.
          </Text>
          <Text style={styles.cardBody}>
            This means you spend more time on words you find difficult and less
            time on words you already know.
          </Text>

          {/* Expanding intervals visual */}
          <View style={styles.intervalsRow}>
            <View style={[styles.intervalBox, styles.intervalBox1]}>
              <Text style={styles.intervalText}>1d</Text>
            </View>
            <View style={[styles.intervalBox, styles.intervalBox2]}>
              <Text style={styles.intervalText}>6d</Text>
            </View>
            <View style={[styles.intervalBox, styles.intervalBox3]}>
              <Text style={styles.intervalText}>15d</Text>
            </View>
            <View style={[styles.intervalBox, styles.intervalBox4]}>
              <Text style={styles.intervalText}>35d</Text>
            </View>
          </View>
          <Text style={styles.intervalsCaption}>
            Intervals grow with each correct answer
          </Text>
        </View>

        {/* ── Section 2: How We Score Your Answers ────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>HOW WE SCORE YOUR ANSWERS</Text>
          <Text style={styles.cardBody}>
            We measure both correctness and response time to fine-tune your
            learning schedule.
          </Text>

          <View style={styles.scoreRow}>
            <View style={[styles.scoreIndicator, { backgroundColor: AppColors.green }]} />
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreLabel}>FAST + CORRECT</Text>
              <Text style={styles.scoreDescription}>
                You know this word well. Next review pushed far out.
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={[styles.scoreIndicator, { backgroundColor: AppColors.yellow }]} />
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreLabel}>SLOW + CORRECT</Text>
              <Text style={styles.scoreDescription}>
                You're learning it. Review comes back sooner to reinforce.
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={[styles.scoreIndicator, { backgroundColor: AppColors.red }]} />
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreLabel}>WRONG ANSWER</Text>
              <Text style={styles.scoreDescription}>
                No problem. The word resets so you see it again soon.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: The SM-2 Algorithm ───────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>THE SM-2 ALGORITHM</Text>
          <Text style={styles.cardBody}>
            This app uses the SM-2 algorithm, the same method behind popular
            flashcard tools like Anki used by millions of learners worldwide.
          </Text>
          <Text style={styles.cardBody}>
            Developed by Dr. Piotr Wozniak in 1987, SM-2 is one of the most
            studied and proven techniques for long-term memorization. It
            adapts to your performance on each individual word, creating a
            personalized review schedule.
          </Text>
        </View>

        {/* ── Section 4: Tips for Best Results ────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>TIPS FOR BEST RESULTS</Text>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>1</Text>
            <Text style={styles.tipText}>
              Practice daily, even just 5 minutes. Short consistent sessions
              beat long irregular ones.
            </Text>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>2</Text>
            <Text style={styles.tipText}>
              Take a moment to think before answering. Guessing randomly won't
              help your memory.
            </Text>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>3</Text>
            <Text style={styles.tipText}>
              Wrong answers help too. They reset the schedule so you see the
              word again sooner.
            </Text>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>4</Text>
            <Text style={styles.tipText}>
              Consistency beats intensity. Ten minutes a day is better than an
              hour once a week.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

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

  // Header
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

  // Card (shared across sections)
  card: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  cardBody: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },

  // Expanding intervals visual
  intervalsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  intervalBox: {
    backgroundColor: AppColors.green,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  intervalBox1: { flex: 1 },
  intervalBox2: { flex: 2 },
  intervalBox3: { flex: 3 },
  intervalBox4: { flex: 4 },
  intervalText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  intervalsCaption: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },

  // Score rows
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.lightGray,
    paddingVertical: Spacing.md,
  },
  scoreIndicator: {
    width: 16,
    height: 16,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  scoreTextGroup: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  scoreDescription: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },

  // Tip rows
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.lightGray,
    paddingVertical: Spacing.md,
  },
  tipNumber: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    width: 32,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 24,
  },
});
