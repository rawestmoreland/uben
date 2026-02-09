import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
  shadowStyleSmall,
} from '@/constants/design';
import { vocabularyService } from '@/services/vocabularyService';
import type { UserNounWithCategory } from '@/types/database';

// ── My Words Screen ──────────────────────────────────────────────────

export default function MyWordsScreen() {
  const [words, setWords] = useState<UserNounWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWords = useCallback(async () => {
    try {
      const data = await vocabularyService.getUserNouns();
      setWords(data);
    } catch (error) {
      console.error('[MyWords] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload whenever the screen is focused (e.g. after adding a word)
  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [loadWords]),
  );

  const handleDelete = useCallback(
    (word: UserNounWithCategory) => {
      Alert.alert(
        'Delete Word',
        `Remove "${word.article} ${word.german}" from your words? This will also delete any review progress for this word.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const result = await vocabularyService.deleteUserNoun(word.id);
              if (result.success) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                setWords((prev) => prev.filter((w) => w.id !== word.id));
              } else {
                Alert.alert('Error', result.error ?? 'Failed to delete word');
              }
            },
          },
        ],
      );
    },
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>MY WORDS</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/add-word')}
            accessibilityRole="button"
            accessibilityLabel="Add word"
            hitSlop={12}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────── */}
      {!isLoading && words.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            words.length > 0 ? (
              <Text style={styles.countHeader}>
                {words.length} WORD{words.length !== 1 ? 'S' : ''} ADDED
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <WordRow word={item} onDelete={() => handleDelete(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Word Row ─────────────────────────────────────────────────────────

interface WordRowProps {
  word: UserNounWithCategory;
  onDelete: () => void;
}

function WordRow({ word, onDelete }: WordRowProps) {
  return (
    <View style={[styles.wordRow, shadowStyleSmall]}>
      <View style={styles.wordInfo}>
        <Text style={styles.wordText}>
          <Text style={styles.wordArticle}>{word.article} </Text>
          {word.german}
        </Text>
        <View style={styles.wordMeta}>
          {word.english && (
            <Text style={styles.wordEnglish}>{word.english}</Text>
          )}
          <Text style={styles.wordCategory}>{word.category_display_name}</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.deleteButtonPressed,
        ]}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${word.german}`}
        hitSlop={8}
      >
        <Text style={styles.deleteButtonText}>DEL</Text>
      </Pressable>
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyCard, shadowStyle]}>
        <Text style={styles.emptyTitle}>NO WORDS YET</Text>
        <Text style={styles.emptySubtext}>
          Add your own German nouns to practice alongside the built-in
          vocabulary.
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.emptyAddButton,
          pressed && styles.emptyAddButtonPressed,
        ]}
        onPress={() => router.push('/add-word')}
        accessibilityRole="button"
        accessibilityLabel="Add your first word"
      >
        <Text style={styles.emptyAddButtonText}>+ ADD YOUR FIRST WORD</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
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
  addButton: {
    width: 44,
    height: 44,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },

  // List
  listContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  countHeader: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },

  // Word row
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  wordInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  wordText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  wordArticle: {
    fontWeight: Typography.bold,
    color: AppColors.blue,
  },
  wordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  wordEnglish: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
  },
  wordCategory: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    backgroundColor: AppColors.lightGray,
    borderWidth: 1,
    borderColor: AppColors.textSecondary,
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
  },

  // Delete button
  deleteButton: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.red,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  deleteButtonPressed: {
    backgroundColor: AppColors.red,
  },
  deleteButtonText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.red,
    letterSpacing: 1,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  emptyCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'stretch',
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
    lineHeight: 24,
  },
  emptyAddButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    alignSelf: 'stretch',
    ...shadowStyle,
  },
  emptyAddButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  emptyAddButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
