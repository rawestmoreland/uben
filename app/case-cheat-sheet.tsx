import { CheatSheetSection } from '@/components/reference/cheat-sheet-section';
import {
  ArticleTable,
  CaseOverviewList,
  PrepositionGroups,
} from '@/components/reference/case-sheet-parts';
import { ReferenceScreenShell } from '@/components/reference/reference-screen-shell';
import { ReferenceTable } from '@/components/reference/reference-table';
import { AppColors, Spacing, Typography } from '@/constants/design';
import {
  CASE_OVERVIEW,
  DEFINITE_ARTICLES,
  INDEFINITE_ARTICLES,
  PERSONAL_PRONOUNS,
} from '@/constants/reference/cases';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

// ── Case Cheat Sheet ─────────────────────────────────────────────────
//
// Reference screen: the four cases, article and pronoun tables, and the
// prepositions grouped by the case they take. Free for everyone.

const PRONOUN_COLUMNS = [
  { key: 'accusative', header: CASE_OVERVIEW[1].short },
  { key: 'dative', header: CASE_OVERVIEW[2].short },
];

const PRONOUN_ROWS = PERSONAL_PRONOUNS.map((pronoun) => ({
  key: pronoun.nominative,
  header: pronoun.nominative,
  cells: [pronoun.accusative, pronoun.dative],
}));

export default function CaseCheatSheetScreen() {
  const { t } = useTranslation('app');

  return (
    <ReferenceScreenShell
      title={t('case_sheet.title')}
      subtitle={t('case_sheet.intro')}
    >
      <CheatSheetSection
        title={t('case_sheet.sections.cases')}
        accentColor={AppColors.yellow}
      >
        <CaseOverviewList />
      </CheatSheetSection>

      <CheatSheetSection
        title={t('case_sheet.sections.definite')}
        accentColor={AppColors.blue}
      >
        <ArticleTable forms={DEFINITE_ARTICLES} />
        <Text style={styles.note}>{t('case_sheet.noun_endings')}</Text>
      </CheatSheetSection>

      <CheatSheetSection
        title={t('case_sheet.sections.indefinite')}
        accentColor={AppColors.pink}
      >
        <ArticleTable forms={INDEFINITE_ARTICLES} />
        <Text style={styles.note}>{t('case_sheet.ein_words_note')}</Text>
      </CheatSheetSection>

      <CheatSheetSection
        title={t('case_sheet.sections.pronouns')}
        accentColor={AppColors.green}
      >
        <ReferenceTable
          cornerLabel={CASE_OVERVIEW[0].short}
          columns={PRONOUN_COLUMNS}
          rows={PRONOUN_ROWS}
        />
      </CheatSheetSection>

      <CheatSheetSection
        title={t('case_sheet.sections.prepositions')}
        accentColor={AppColors.purple}
      >
        <PrepositionGroups />
      </CheatSheetSection>
    </ReferenceScreenShell>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
});
