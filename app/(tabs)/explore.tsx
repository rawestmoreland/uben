import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── About Screen ─────────────────────────────────────────────────────

export default function AboutScreen() {
  const { t } = useTranslation('app');
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('how_it_works.title').toUpperCase()}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('how_it_works.subtitle').toUpperCase()}
          </Text>
        </View>

        {/* ── Section 1: What is Spaced Repetition? ───────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {t('how_it_works.what_is_spaced_repetition').toUpperCase()}
          </Text>
          <Text style={styles.cardBody}>{t('how_it_works.sr_definition')}</Text>

          {/* Expanding intervals visual */}
          <View style={styles.intervalsRow}>
            <View style={[styles.intervalBox, styles.intervalBox1]}>
              <Text style={styles.intervalText}>{t('how_it_works.1d')}</Text>
            </View>
            <View style={[styles.intervalBox, styles.intervalBox2]}>
              <Text style={styles.intervalText}>{t('how_it_works.6d')}</Text>
            </View>
            <View style={[styles.intervalBox, styles.intervalBox3]}>
              <Text style={styles.intervalText}>{t('how_it_works.15d')}</Text>
            </View>
            <View style={[styles.intervalBox, styles.intervalBox4]}>
              <Text style={styles.intervalText}>{t('how_it_works.35d')}</Text>
            </View>
          </View>
          <Text style={styles.intervalsCaption}>
            {t('how_it_works.intervals_grow')}
          </Text>
        </View>

        {/* ── Section 2: How We Score Your Answers ────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {t('how_it_works.how_we_score_your_answers').toUpperCase()}
          </Text>
          <Text style={styles.cardBody}>
            {t('how_it_works.we_measure_both')}
          </Text>

          <View style={styles.scoreRow}>
            <View
              style={[
                styles.scoreIndicator,
                { backgroundColor: AppColors.green },
              ]}
            />
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreLabel}>
                {t('how_it_works.fast_correct')}
              </Text>
              <Text style={styles.scoreDescription}>
                {t('how_it_works.fast_correct_description')}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View
              style={[
                styles.scoreIndicator,
                { backgroundColor: AppColors.yellow },
              ]}
            />
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreLabel}>
                {t('how_it_works.slow_correct')}
              </Text>
              <Text style={styles.scoreDescription}>
                {t('how_it_works.slow_correct_description')}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View
              style={[
                styles.scoreIndicator,
                { backgroundColor: AppColors.red },
              ]}
            />
            <View style={styles.scoreTextGroup}>
              <Text style={styles.scoreLabel}>
                {t('how_it_works.wrong_answer').toUpperCase()}
              </Text>
              <Text style={styles.scoreDescription}>
                {t('how_it_works.wrong_answer_description')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: The SM-2 Algorithm ───────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {t('how_it_works.the_sm_2_algorithm').toUpperCase()}
          </Text>
          <Text style={styles.cardBody}>
            {t('how_it_works.sm_2_definition')}
          </Text>
        </View>

        {/* ── Section 4: Tips for Best Results ────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {t('how_it_works.tips_for_best_results').toUpperCase()}
          </Text>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>1</Text>
            <Text style={styles.tipText}>{t('how_it_works.tip_1')}</Text>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>2</Text>
            <Text style={styles.tipText}>{t('how_it_works.tip_2')}</Text>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>3</Text>
            <Text style={styles.tipText}>{t('how_it_works.tip_3')}</Text>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.tipNumber}>4</Text>
            <Text style={styles.tipText}>{t('how_it_works.tip_4')}</Text>
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
