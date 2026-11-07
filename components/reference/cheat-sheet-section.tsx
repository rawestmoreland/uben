import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CheatSheetSectionProps {
  title: string;
  /** Left accent strip colour. */
  accentColor: string;
  children: ReactNode;
}

/** Titled card used to group one table or list on a reference screen. */
export function CheatSheetSection({
  title,
  accentColor,
  children,
}: CheatSheetSectionProps) {
  return (
    <View style={[styles.card, shadowStyleSmall]}>
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <Text style={styles.title}>{uiUpperCase(title)}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    marginBottom: Spacing.lg,
  },
  accentStrip: {
    width: 8,
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
  },
});
