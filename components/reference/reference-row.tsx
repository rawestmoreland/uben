import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ReferenceRowProps {
  title: string;
  subtitle: string;
  accentColor: string;
  /** Shown as a badge (e.g. "Premium") when the item is gated. */
  badge?: string;
  onPress: () => void;
}

/** One tappable entry on the Reference tab. */
export function ReferenceRow({
  title,
  subtitle,
  accentColor,
  badge,
  onPress,
}: ReferenceRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        shadowStyleSmall,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{uiUpperCase(title)}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{uiUpperCase(badge)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    minHeight: 64,
  },
  rowPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  accentStrip: {
    width: 8,
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  textGroup: {
    flex: 1,
  },
  title: {
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
  badge: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  badgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
});
