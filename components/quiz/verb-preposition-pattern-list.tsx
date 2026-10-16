import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type {
  VerbPrepositionBrowseData,
  VerbPrepositionBrowseItem,
  VerbPrepositionBrowseSection,
} from '@/services/verbPrepositionBrowseService';
import { uiUpperCase } from '@/utils/uiText';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { VerbPrepositionPatternRow } from './verb-preposition-pattern-row';

interface VerbPrepositionPatternListProps {
  data: VerbPrepositionBrowseData;
  eszettPreference: 'eszett' | 'ss';
}

function itemKey(item: VerbPrepositionBrowseItem): string {
  return item.key;
}

/** Cheat sheet: a section per preposition, one row per pattern, plus a progress summary. */
export function VerbPrepositionPatternList({
  data,
  eszettPreference,
}: VerbPrepositionPatternListProps) {
  const { t } = useTranslation('app');

  const renderItem = useCallback(
    ({ item }: { item: VerbPrepositionBrowseItem }) => (
      <VerbPrepositionPatternRow
        item={item}
        eszettPreference={eszettPreference}
      />
    ),
    [eszettPreference],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: VerbPrepositionBrowseSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {uiUpperCase(section.preposition)}
        </Text>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    ),
    [],
  );

  return (
    <SectionList
      sections={data.sections}
      keyExtractor={itemKey}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <Text style={styles.summary}>
          {data.startedCount === 0
            ? t('verb_preposition_patterns.summary_empty', {
                total: data.patternCount,
              })
            : t('verb_preposition_patterns.summary', {
                started: data.startedCount,
                total: data.patternCount,
              })}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xxl,
  },
  summary: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AppColors.pink,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  sectionCount: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
});
