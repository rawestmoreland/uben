import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import type { VerbPrepositionButton } from '@/services/verbPrepositionService';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const BUTTONS_PER_ROW = 4;

type ButtonState = 'idle' | 'correct' | 'wrong' | 'dimmed' | 'unavailable';

interface VerbPrepositionGridProps {
  /** The whole grid in its fixed order; disabled ones aren't offered for this question. */
  buttons: VerbPrepositionButton[];
  /** The learner's pick; null while they're still answering. */
  selectedPreposition: string | null;
  /** Every accepted answer — only revealed once `isFeedback` is true. */
  acceptedAnswers: string[];
  isFeedback: boolean;
  onSelect: (preposition: string) => void;
}

/**
 * The preposition answer buttons. Every preposition keeps its position in
 * every question so learners build muscle memory; the ones not offered for
 * this question stay in place but greyed out. During feedback every accepted
 * answer turns green and a wrong pick turns red.
 */
export function VerbPrepositionGrid({
  buttons,
  selectedPreposition,
  acceptedAnswers,
  isFeedback,
  onSelect,
}: VerbPrepositionGridProps) {
  const rows = useMemo(() => {
    const chunks: VerbPrepositionButton[][] = [];
    for (let start = 0; start < buttons.length; start += BUTTONS_PER_ROW) {
      chunks.push(buttons.slice(start, start + BUTTONS_PER_ROW));
    }
    return chunks;
  }, [buttons]);

  function getState({
    preposition,
    enabled,
  }: VerbPrepositionButton): ButtonState {
    if (!enabled) return 'unavailable';
    if (!isFeedback) return 'idle';
    if (acceptedAnswers.includes(preposition)) return 'correct';
    if (preposition === selectedPreposition) return 'wrong';
    return 'dimmed';
  }

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].preposition} style={styles.row}>
          {row.map((button) => (
            <PrepositionButton
              key={button.preposition}
              preposition={button.preposition}
              state={getState(button)}
              isSelected={button.preposition === selectedPreposition}
              disabled={isFeedback || !button.enabled}
              onSelect={onSelect}
            />
          ))}
          {/* Keeps a short last row's buttons the same width as the rest */}
          {Array.from({ length: BUTTONS_PER_ROW - row.length }, (_, index) => (
            <View key={`spacer-${index}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}

interface PrepositionButtonProps {
  preposition: string;
  state: ButtonState;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (preposition: string) => void;
}

const PrepositionButton = memo(function PrepositionButton({
  preposition,
  state,
  isSelected,
  disabled,
  onSelect,
}: PrepositionButtonProps) {
  const handlePress = useCallback(
    () => onSelect(preposition),
    [onSelect, preposition],
  );
  const isFlat = state === 'dimmed' || state === 'unavailable';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        !isFlat && shadowStyleSmall,
        state === 'correct' && styles.buttonCorrect,
        state === 'wrong' && styles.buttonWrong,
        state === 'dimmed' && styles.buttonDimmed,
        state === 'unavailable' && styles.buttonUnavailable,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={preposition}
      accessibilityState={{ disabled, selected: isSelected }}
    >
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
        {preposition}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.sm + Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm + Spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  button: {
    flex: 1,
    minHeight: Layout.buttonHeight,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  buttonCorrect: {
    backgroundColor: AppColors.green,
  },
  buttonWrong: {
    backgroundColor: AppColors.red,
  },
  buttonDimmed: {
    backgroundColor: AppColors.lightGray,
    opacity: 0.5,
  },
  buttonUnavailable: {
    backgroundColor: AppColors.lightGray,
    borderColor: AppColors.textSecondary,
    opacity: 0.35,
  },
  buttonPressed: {
    backgroundColor: AppColors.yellow,
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  label: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
});
