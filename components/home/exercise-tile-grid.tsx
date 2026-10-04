import { AppColors, Spacing, Typography } from '@/constants/design';
import { useAdjectiveDeclensionEntitlement } from '@/hooks/use-adjective-declension-entitlement';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { ExerciseTile, type ExerciseTileBadge } from './exercise-tile';

type ExerciseId = 'articles' | 'plurals' | 'adjectives' | 'verbs';

interface ExerciseConfig {
  id: ExerciseId;
  route: Href;
  accentColor: string;
  status: 'available' | 'coming_soon';
  /** Premium exercises resolve to a trial/locked badge and paywall redirect. */
  entitlement?: 'adjective_declension';
}

// Adding an exercise type is one entry here plus its `home_screen.tiles.<id>` strings.
const EXERCISES: readonly ExerciseConfig[] = [
  {
    id: 'articles',
    route: '/select-categories',
    accentColor: AppColors.blue,
    status: 'available',
  },
  {
    id: 'plurals',
    route: '/select-categories',
    accentColor: AppColors.green,
    status: 'coming_soon',
  },
  {
    id: 'adjectives',
    route: '/adjective-quiz',
    accentColor: AppColors.purple,
    status: 'available',
    entitlement: 'adjective_declension',
  },
  {
    id: 'verbs',
    route: '/select-categories',
    accentColor: AppColors.yellow,
    status: 'coming_soon',
  },
];

interface ExerciseTileGridProps {
  /** Articles cards due today; other exercises don't track due counts yet. */
  articlesDueCount: number;
  isLoading: boolean;
}

export function ExerciseTileGrid({
  articlesDueCount,
  isLoading,
}: ExerciseTileGridProps) {
  const { t } = useTranslation('app');
  const { isUnlocked, canAccess, trialQuestionsRemaining } =
    useAdjectiveDeclensionEntitlement();

  const handlePress = useCallback(
    (id: string) => {
      const exercise = EXERCISES.find((candidate) => candidate.id === id);
      if (!exercise) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isLocked =
        exercise.entitlement === 'adjective_declension' && !canAccess;
      if (isLocked) {
        router.push({
          pathname: '/paywall',
          params: {
            redirectTo: exercise.route as string,
            source: 'adjective_quiz_entry',
          },
        });
        return;
      }
      router.push(exercise.route);
    },
    [canAccess],
  );

  const tiles = useMemo(
    () =>
      EXERCISES.map((exercise) => {
        let badge: ExerciseTileBadge | undefined;
        if (exercise.status === 'coming_soon') {
          badge = { kind: 'soon', label: t('home_screen.soon_badge').toUpperCase() };
        } else if (exercise.entitlement && !isUnlocked) {
          badge =
            trialQuestionsRemaining > 0
              ? {
                  kind: 'trial',
                  label: t('adjective_quiz.trial_badge', {
                    count: trialQuestionsRemaining,
                  }).toUpperCase(),
                }
              : {
                  kind: 'locked',
                  label: t('paywall.premium_badge').toUpperCase(),
                };
        }

        let footer: string | undefined;
        if (exercise.id === 'articles' && !isLoading) {
          footer = t('home_screen.tile_due', { count: articlesDueCount });
        }

        const title = t(`home_screen.tiles.${exercise.id}.title`);
        return {
          exercise,
          title,
          subtitle: t(`home_screen.tiles.${exercise.id}.subtitle`),
          badge,
          footer,
        };
      }),
    [t, isUnlocked, trialQuestionsRemaining, articlesDueCount, isLoading],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('home_screen.practice_label')}</Text>
      <View style={styles.grid}>
        {tiles.map(({ exercise, title, subtitle, badge, footer }) => (
          <ExerciseTile
            key={exercise.id}
            id={exercise.id}
            title={title.toUpperCase()}
            subtitle={subtitle}
            accentColor={exercise.accentColor}
            accessibilityLabel={title}
            badge={badge}
            footer={footer}
            disabled={exercise.status === 'coming_soon'}
            onPress={handlePress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
});
