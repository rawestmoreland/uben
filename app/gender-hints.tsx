import { GenderHintCard } from '@/components/reference/gender-hint-card';
import { ReferenceScreenShell } from '@/components/reference/reference-screen-shell';
import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import {
  getHintsForArticle,
  HINT_ARTICLES,
  type HintArticle,
} from '@/constants/reference/genderHints';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

// ── Gender Hints ─────────────────────────────────────────────────────
//
// Reference screen: endings and meaning groups that predict der / die / das.
// Free for everyone (it supports the article quiz rather than being Pro content).

const ARTICLE_COLORS: Record<HintArticle, string> = {
  die: AppColors.pink,
  der: AppColors.blue,
  das: AppColors.green,
};

export default function GenderHintsScreen() {
  const { t } = useTranslation('app');

  return (
    <ReferenceScreenShell
      title={t('gender_hints.title')}
      subtitle={t('gender_hints.intro')}
    >
      {HINT_ARTICLES.map((article) => (
        <View key={article} style={styles.section}>
          <View
            style={[
              styles.sectionHeader,
              shadowStyleSmall,
              { backgroundColor: ARTICLE_COLORS[article] },
            ]}
          >
            <Text style={styles.sectionArticle}>{article.toUpperCase()}</Text>
            <Text style={styles.sectionCaption}>
              {t(`gender_hints.gender.${article}`)}
            </Text>
          </View>
          {getHintsForArticle(article).map((hint) => (
            <GenderHintCard key={hint.id} hint={hint} />
          ))}
        </View>
      ))}
      <View style={styles.tip}>
        <Text style={styles.tipText}>{t('gender_hints.tip')}</Text>
      </View>
    </ReferenceScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  sectionArticle: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  sectionCaption: {
    flex: 1,
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  tip: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.md,
  },
  tipText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    lineHeight: 20,
  },
});
