import { AppColors, Spacing, Typography } from '@/constants/design';
import type { VerbPrepositionCompoundInfo } from '@/services/verbPrepositionService';
import { applyGermanTextPreference } from '@/utils/germanText';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionCompoundNoteProps {
  compound: VerbPrepositionCompoundInfo;
  /** The compound the learner should have picked, e.g. "darauf". */
  answer: string;
  eszettPreference: 'eszett' | 'ss';
}

/**
 * The da(r)-/wo(r)- part of the feedback panel: how the answer is built
 * ("da + r + auf") and the rule for people, which take the preposition + a
 * pronoun instead (Ich warte auf ihn). The rule is only shown for verbs that
 * also take a person.
 */
export function VerbPrepositionCompoundNote({
  compound,
  answer,
  eszettPreference,
}: VerbPrepositionCompoundNoteProps) {
  const { t } = useTranslation('app');

  return (
    <View style={styles.container}>
      <Text style={styles.construction}>{compound.construction}</Text>
      {compound.personExample && (
        <Text style={styles.personRule}>
          {t('verb_preposition_compound_quiz.person_rule', {
            compound: answer,
            example: applyGermanTextPreference(
              compound.personExample,
              eszettPreference,
            ),
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  construction: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  personRule: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
