import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
  shadowStyleSmall,
} from '@/constants/design';
import { vocabularyService } from '@/services/vocabularyService';
import type { Category } from '@/types/database';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Constants ────────────────────────────────────────────────────────

const ARTICLES = ['der', 'die', 'das'] as const;
type Article = (typeof ARTICLES)[number];

// ── Add Word Screen ──────────────────────────────────────────────────

export default function AddWordScreen() {
  // Form state
  const [german, setGerman] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [plural, setPlural] = useState('');
  const [english, setEnglish] = useState('');

  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    vocabularyService.getCategories().then(setCategories);
  }, []);

  const isValid =
    german.trim().length > 0 && article !== null && categoryId !== null;

  const handleSave = useCallback(async () => {
    if (!isValid || !article || !categoryId) return;

    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await vocabularyService.addUserNoun({
        german: german.trim(),
        article,
        category_id: categoryId,
        plural: plural.trim() || undefined,
        english: english.trim() || undefined,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.error ?? 'Failed to add word');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [german, article, categoryId, plural, english, isValid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.closeButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
            <Text style={styles.headerTitle}>ADD WORD</Text>
            <View style={{ width: 44, height: 44 }} />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Error Banner ──────────────────────────────────── */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── German Word ───────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>GERMAN NOUN *</Text>
            <TextInput
              style={styles.textInput}
              value={german}
              onChangeText={(text) => {
                setGerman(text);
                setError(null);
              }}
              placeholder="e.g. Hund"
              placeholderTextColor={AppColors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* ── Article Selector ──────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ARTICLE *</Text>
            <View style={styles.articleRow}>
              {ARTICLES.map((a) => {
                const isSelected = article === a;
                return (
                  <Pressable
                    key={a}
                    style={[
                      styles.articleButton,
                      shadowStyleSmall,
                      isSelected && styles.articleButtonSelected,
                    ]}
                    onPress={() => {
                      setArticle(a);
                      setError(null);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${a}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.articleButtonText,
                        isSelected && styles.articleButtonTextSelected,
                      ]}
                    >
                      {a}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Category Selector ─────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CATEGORY *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setError(null);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={cat.display_name}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.display_name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Plural (optional) ─────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PLURAL</Text>
            <TextInput
              style={styles.textInput}
              value={plural}
              onChangeText={setPlural}
              placeholder="e.g. Hunde"
              placeholderTextColor={AppColors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* ── English (optional) ────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ENGLISH TRANSLATION</Text>
            <TextInput
              style={styles.textInput}
              value={english}
              onChangeText={setEnglish}
              placeholder="e.g. dog"
              placeholderTextColor={AppColors.textSecondary}
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        </ScrollView>

        {/* ── Save Button ─────────────────────────────────────── */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              !isValid && styles.saveButtonDisabled,
              pressed && isValid && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={!isValid || isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Save word"
          >
            <Text
              style={[
                styles.saveButtonText,
                !isValid && styles.saveButtonTextDisabled,
              ]}
            >
              {isSubmitting ? 'SAVING...' : 'SAVE WORD'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
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

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },

  // Error
  errorBanner: {
    backgroundColor: AppColors.red,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.white,
    textAlign: 'center',
  },

  // Field group
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },

  // Text input
  textInput: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.black,
  },

  // Article selector
  articleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  articleButton: {
    flex: 1,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  articleButtonSelected: {
    backgroundColor: AppColors.blue,
  },
  articleButtonText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  articleButtonTextSelected: {
    color: AppColors.white,
  },

  // Category chips
  categoryScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  categoryChipSelected: {
    backgroundColor: AppColors.blue,
    borderWidth: Layout.borderWidth,
  },
  categoryChipText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  categoryChipTextSelected: {
    color: AppColors.white,
  },

  // Footer
  footer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.md,
    borderTopWidth: Layout.borderWidth,
    borderTopColor: AppColors.black,
    backgroundColor: AppColors.cream,
  },
  saveButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    ...shadowStyle,
  },
  saveButtonDisabled: {
    backgroundColor: AppColors.lightGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  saveButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  saveButtonTextDisabled: {
    color: AppColors.textSecondary,
  },
});
