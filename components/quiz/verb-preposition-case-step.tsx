import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import {
  CASE_STEP_CHOICES,
  formatCaseName,
} from '@/services/verbPrepositionService';
import type { VerbPrepositionCase } from '@/types/database';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionCaseStepProps {
  onSelect: (selectedCase: VerbPrepositionCase) => void;
}

/**
 * The second tap on a two-way preposition: Akkusativ or Dativ. Takes the
 * Continue button's place under the (locked) preposition grid. The case names
 * are German grammar terms, so they are neither translated nor locale-uppercased
 * (Turkish would turn the i of "Akkusativ" into a dotted capital).
 */
export function VerbPrepositionCaseStep({
  onSelect,
}: VerbPrepositionCaseStepProps) {
  const { t } = useTranslation('app');

  return (
    <View>
      <Text style={styles.prompt} accessibilityRole="header">
        {t('verb_preposition_quiz.case_prompt')}
      </Text>
      <View style={styles.row}>
        {CASE_STEP_CHOICES.map((caseGoverned) => (
          <Pressable
            key={caseGoverned}
            style={({ pressed }) => [
              styles.button,
              shadowStyleSmall,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onSelect(caseGoverned)}
            accessibilityRole="button"
            accessibilityLabel={formatCaseName(caseGoverned)}
          >
            <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
              {formatCaseName(caseGoverned).toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm + Spacing.xs,
  },
  button: {
    flex: 1,
    minHeight: Layout.buttonHeight,
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  buttonPressed: {
    backgroundColor: AppColors.white,
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  label: {
    fontSize: Typography.body + 2,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
});
