import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import {
  ARTICLE_COLUMN_HEADERS,
  ARTICLE_COLUMNS,
  CASE_OVERVIEW,
  PREPOSITION_GROUPS,
  TWO_WAY_EXAMPLES,
  type ArticleColumn,
  type CaseKey,
} from '@/constants/reference/cases';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { ReferenceTable } from './reference-table';

const COLUMN_COLORS: Record<ArticleColumn, string> = {
  masculine: AppColors.blue,
  feminine: AppColors.pink,
  neuter: AppColors.green,
  plural: AppColors.yellow,
};

const ARTICLE_TABLE_COLUMNS = ARTICLE_COLUMNS.map((column) => ({
  key: column,
  header: ARTICLE_COLUMN_HEADERS[column],
  color: COLUMN_COLORS[column],
}));

/** The four cases: question, role and an example sentence each. */
export function CaseOverviewList() {
  const { t } = useTranslation('app');
  return (
    <View>
      {CASE_OVERVIEW.map((entry) => (
        <View key={entry.key} style={styles.overviewRow}>
          <Text style={styles.overviewName}>
            {entry.name} <Text style={styles.question}>{entry.question}</Text>
          </Text>
          <Text style={styles.role}>{t(`case_sheet.roles.${entry.key}`)}</Text>
          <Text style={styles.example}>{entry.example}</Text>
        </View>
      ))}
    </View>
  );
}

/** Article table: one row per case, one column per gender and plural. */
export function ArticleTable({
  forms,
}: {
  forms: Record<CaseKey, Record<ArticleColumn, string>>;
}) {
  return (
    <ReferenceTable
      columns={ARTICLE_TABLE_COLUMNS}
      rows={CASE_OVERVIEW.map((entry) => ({
        key: entry.key,
        header: entry.short,
        cells: ARTICLE_COLUMNS.map((column) => forms[entry.key][column]),
      }))}
    />
  );
}

/** Prepositions grouped by the case they take, plus the wo?/wohin? rule. */
export function PrepositionGroups() {
  const { t } = useTranslation('app');
  return (
    <View style={styles.groups}>
      {PREPOSITION_GROUPS.map((group) => (
        <View key={group.key}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <Text style={styles.prepositions}>
            {group.prepositions.join('  ·  ')}
          </Text>
        </View>
      ))}
      <View style={styles.twoWayBox}>
        <Text style={styles.twoWayTitle}>{t('case_sheet.two_way_rule')}</Text>
        {TWO_WAY_EXAMPLES.map((example) => (
          <Text key={example.kind} style={styles.example}>
            {example.question} {example.sentence}
            {'  '}
            <Text style={styles.question}>
              {t(`case_sheet.two_way_${example.kind}`)}
            </Text>
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overviewRow: {
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.lightGray,
    paddingVertical: Spacing.sm,
  },
  overviewName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  question: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  role: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  example: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginTop: Spacing.xs,
  },
  groups: {
    gap: Spacing.md,
  },
  groupLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
  },
  prepositions: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },
  twoWayBox: {
    backgroundColor: AppColors.cream,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    padding: Spacing.sm,
  },
  twoWayTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
});
