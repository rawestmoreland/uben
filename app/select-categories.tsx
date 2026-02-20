import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { settingsService } from '@/services/settingsService';
import { vocabularyService } from '@/services/vocabularyService';
import type { Category } from '@/types/database';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CategoryWithCount = Category & { wordCount: number };

export default function SelectCategoriesScreen() {
  const { t } = useTranslation('app');
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllWords, setIsAllWords] = useState(false);

  // Load categories and last selection on mount
  useEffect(() => {
    (async () => {
      try {
        const [cats, lastSelection] = await Promise.all([
          vocabularyService.getCategoriesWithCounts(),
          settingsService.getSelectedCategories(),
        ]);
        setCategories(cats);
        setSelectedIds(lastSelection);
        setIsAllWords(lastSelection.length === 0);
      } catch (error) {
        console.error('[SelectCategories] Failed to load:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setIsAllWords(true);
    }
  }, [selectedIds]);

  const handleAllWords = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAllWords(true);
    setSelectedIds([]);
  }, []);

  const handleCategoryPress = useCallback((categoryId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAllWords(false);
    setSelectedIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  const handleStart = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save selection for next time
    await settingsService.setSelectedCategories(selectedIds);

    // Replace modal with quiz (so back button goes to home, not back to modal)
    router.replace('/quiz');
  }, [selectedIds]);

  const canStart = isAllWords || selectedIds.length > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('categories.title').toUpperCase()}
          </Text>
          <Text style={styles.headerSubtitle}>{t('categories.subtitle')}</Text>
        </View>

        {/* All Words Button */}
        <Pressable
          style={[
            styles.allWordsButton,
            isAllWords && styles.allWordsButtonSelected,
            shadowStyle,
          ]}
          onPress={handleAllWords}
          accessibilityRole="button"
          accessibilityLabel="Practice all words"
          accessibilityState={{ selected: isAllWords }}
        >
          <Text
            style={[
              styles.allWordsText,
              isAllWords && styles.allWordsTextSelected,
            ]}
          >
            {t('categories.all_words').toUpperCase()}
          </Text>
        </Pressable>

        {/* Category List */}
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Pressable
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                  shadowStyle,
                ]}
                onPress={() => handleCategoryPress(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.display_name}, ${item.wordCount} words`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.categoryCardContent}>
                  <Text
                    style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}
                  >
                    {item.display_name}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCount,
                      isSelected && styles.categoryCountSelected,
                    ]}
                  >
                    {t('words_count', { count: item.wordCount })}
                  </Text>
                </View>
                {isSelected && <View style={styles.checkmark} />}
              </Pressable>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Start Button */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.startButton,
              !canStart && styles.startButtonDisabled,
              shadowStyle,
            ]}
            onPress={handleStart}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel="Start practice"
          >
            <Text style={styles.startButtonText}>
              {isAllWords
                ? t('categories.start')
                : t('categories.start_categories', {
                    count: selectedIds.length,
                  })}
            </Text>
          </Pressable>
        </View>
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
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
  },
  allWordsButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  allWordsButtonSelected: {
    backgroundColor: AppColors.blue,
  },
  allWordsText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  allWordsTextSelected: {
    color: AppColors.white,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  categoryCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryCardSelected: {
    backgroundColor: AppColors.blue,
    borderWidth: Layout.borderWidth,
  },
  categoryCardContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginBottom: Spacing.xs,
  },
  categoryNameSelected: {
    color: AppColors.white,
  },
  categoryCount: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
  },
  categoryCountSelected: {
    color: AppColors.white,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
  },
  footer: {
    paddingTop: Spacing.lg,
  },
  startButton: {
    backgroundColor: AppColors.green,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: AppColors.lightGray,
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
