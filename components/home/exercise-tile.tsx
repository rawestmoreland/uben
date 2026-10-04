import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ExerciseTileBadge =
  | { kind: 'trial'; label: string }
  | { kind: 'locked'; label: string }
  | { kind: 'soon'; label: string };

export interface ExerciseTileProps {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  accessibilityLabel: string;
  badge?: ExerciseTileBadge;
  /** Footer line, e.g. "9 due". Omitted for tiles with nothing to report. */
  footer?: string;
  /** Coming-soon tiles render dashed and ignore presses. */
  disabled?: boolean;
  onPress: (id: string) => void;
}

const BADGE_BACKGROUND: Record<ExerciseTileBadge['kind'], string> = {
  trial: AppColors.green,
  locked: AppColors.yellow,
  soon: AppColors.lightGray,
};

export const ExerciseTile = memo(function ExerciseTile({
  id,
  title,
  subtitle,
  accentColor,
  accessibilityLabel,
  badge,
  footer,
  disabled = false,
  onPress,
}: ExerciseTileProps) {
  const handlePress = useCallback(() => onPress(id), [onPress, id]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        disabled ? styles.tileDisabled : shadowStyleSmall,
        pressed && !disabled && styles.tilePressed,
      ]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={styles.footerRow}>
          {footer ? <Text style={styles.footer}>{footer}</Text> : <View />}
          {badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: BADGE_BACKGROUND[badge.kind] },
              ]}
            >
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    width: '48.5%',
    minHeight: 120,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  tileDisabled: {
    borderStyle: 'dashed',
    borderColor: AppColors.textSecondary,
    backgroundColor: AppColors.lightGray,
    opacity: 0.6,
  },
  tilePressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  accentStrip: {
    height: 6,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
  },
  title: {
    flex: 1,
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    minHeight: 22,
  },
  footer: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  badge: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
});
