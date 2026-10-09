import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyleSmall,
} from '@/constants/design';
import type { AdjectiveDifficulty } from '@/hooks/use-adjective-quiz-session';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiUpperCase } from '@/utils/uiText';

// ── Difficulty Control ───────────────────────────────────────────────

interface AdjectiveDifficultyControlProps {
  difficulty: AdjectiveDifficulty;
  onChange: (difficulty: AdjectiveDifficulty) => void;
}

const OPTIONS: readonly AdjectiveDifficulty[] = ['standard', 'advanced'];

export function AdjectiveDifficultyControl({
  difficulty,
  onChange,
}: AdjectiveDifficultyControlProps) {
  const { t } = useTranslation('app');

  return (
    <View>
      <Text style={styles.label}>
        {uiUpperCase(t('adjective_quiz.difficulty_label'))}
      </Text>
      <View style={styles.segmentedControl}>
        {OPTIONS.map((option, index) => {
          const isActive = difficulty === option;
          return (
            <Pressable
              key={option}
              style={({ pressed }) => [
                styles.segmentButton,
                index === 0 && styles.segmentButtonDivider,
                isActive && styles.segmentButtonActive,
                pressed && styles.segmentButtonPressed,
              ]}
              onPress={() => onChange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t(`adjective_quiz.difficulty_${option}`)}
            >
              <Text
                style={[
                  styles.segmentTitle,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {uiUpperCase(t(`adjective_quiz.difficulty_${option}`))}
              </Text>
              <Text
                style={[styles.segmentHint, isActive && styles.segmentTextActive]}
              >
                {t(`adjective_quiz.difficulty_${option}_hint`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Advanced Prompt ──────────────────────────────────────────────────

interface AdvancedEndingsPromptProps {
  difficulty: AdjectiveDifficulty;
  onEnable: () => void;
}

/**
 * Shown on the end-of-session and "all caught up" screens, where a learner
 * who has finished the basics is most likely to want the dative case. Renders
 * nothing if advanced was already on when the screen opened.
 */
export function AdvancedEndingsPrompt({
  difficulty,
  onEnable,
}: AdvancedEndingsPromptProps) {
  const { t } = useTranslation('app');
  const [justEnabled, setJustEnabled] = useState(false);

  const handleEnable = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJustEnabled(true);
    onEnable();
  }, [onEnable]);

  if (justEnabled) {
    return (
      <Text style={styles.enabledNote}>
        {t('adjective_quiz.advanced_enabled_note')}
      </Text>
    );
  }
  if (difficulty === 'advanced') return null;

  return (
    <View style={[styles.promptCard, shadowStyleSmall]}>
      <Text style={styles.promptTitle}>
        {uiUpperCase(t('adjective_quiz.advanced_prompt_title'))}
      </Text>
      <Text style={styles.promptBody}>
        {t('adjective_quiz.advanced_prompt_body')}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.promptButton,
          pressed && styles.promptButtonPressed,
        ]}
        onPress={handleEnable}
        accessibilityRole="button"
        accessibilityLabel={t('adjective_quiz.advanced_prompt_button')}
      >
        <Text style={styles.promptButtonText}>
          {uiUpperCase(t('adjective_quiz.advanced_prompt_button'))}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    minHeight: 72,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    backgroundColor: AppColors.white,
  },
  segmentButtonDivider: {
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  segmentButtonActive: {
    backgroundColor: AppColors.purple,
  },
  segmentButtonPressed: {
    opacity: 0.7,
  },
  segmentTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  segmentHint: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  segmentTextActive: {
    color: AppColors.white,
  },

  promptCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    borderLeftColor: AppColors.purple,
    borderLeftWidth: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignSelf: 'stretch',
  },
  promptTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  promptBody: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.black,
    marginBottom: Spacing.md,
  },
  promptButton: {
    backgroundColor: AppColors.purple,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptButtonPressed: {
    transform: [{ translateY: 2 }],
  },
  promptButtonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
  },
  enabledNote: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.purple,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
