import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { PLURAL_ENDINGS, type PluralEnding } from '@/services/pluralService';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// The fixed 3x3 layout: PLURAL_ENDINGS is already in row-by-row order.
const GRID_ROWS = [0, 3, 6].map((start) => PLURAL_ENDINGS.slice(start, start + 3));

type ButtonState = 'idle' | 'correct' | 'wrong' | 'dimmed';

interface PluralEndingGridProps {
  /** The learner's pick; null while they're still answering. */
  selectedEnding: PluralEnding | null;
  /** The card's correct ending — only revealed once `isFeedback` is true. */
  correctEnding: PluralEnding;
  isFeedback: boolean;
  onSelect: (ending: PluralEnding) => void;
}

/**
 * The nine plural-ending answer buttons. Same buttons in the same order for
 * every question so learners build muscle memory; during feedback the
 * correct one turns green and a wrong pick turns red.
 */
export function PluralEndingGrid({
  selectedEnding,
  correctEnding,
  isFeedback,
  onSelect,
}: PluralEndingGridProps) {
  const { t } = useTranslation('app');

  function getState(ending: PluralEnding): ButtonState {
    if (!isFeedback) return 'idle';
    if (ending === correctEnding) return 'correct';
    if (ending === selectedEnding) return 'wrong';
    return 'dimmed';
  }

  return (
    <View style={styles.grid}>
      {GRID_ROWS.map((row) => (
        <View key={row[0].ending} style={styles.row}>
          {row.map(({ ending, label }) => (
            <EndingButton
              key={ending}
              ending={ending}
              label={label}
              // "¨-e" isn't screen-reader friendly, so spell out its meaning
              accessibilityLabel={t(`plural_quiz.endings.${ending}`)}
              state={getState(ending)}
              isSelected={ending === selectedEnding}
              disabled={isFeedback}
              onSelect={onSelect}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface EndingButtonProps {
  ending: PluralEnding;
  label: string;
  accessibilityLabel: string;
  state: ButtonState;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (ending: PluralEnding) => void;
}

const EndingButton = memo(function EndingButton({
  ending,
  label,
  accessibilityLabel,
  state,
  isSelected,
  disabled,
  onSelect,
}: EndingButtonProps) {
  const handlePress = useCallback(() => onSelect(ending), [onSelect, ending]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        state !== 'dimmed' && shadowStyleSmall,
        state === 'correct' && styles.buttonCorrect,
        state === 'wrong' && styles.buttonWrong,
        state === 'dimmed' && styles.buttonDimmed,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: isSelected }}
    >
      <Text style={styles.label}>{label}</Text>
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
  button: {
    flex: 1,
    minHeight: Layout.buttonHeight,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    alignItems: 'center',
    justifyContent: 'center',
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
