import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface UpdateBannerProps {
  title: string;
  body: string;
  updateLabel: string;
  laterLabel: string;
  dismissLabel: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

/** Dismissible "update available" card shown on the Home screen. */
export function UpdateBanner({
  title,
  body,
  updateLabel,
  laterLabel,
  dismissLabel,
  onUpdate,
  onDismiss,
}: UpdateBannerProps) {
  return (
    <View style={[styles.banner, shadowStyleSmall]}>
      <Text style={styles.title}>{uiUpperCase(title)}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.updateButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onUpdate}
          accessibilityRole="button"
          accessibilityLabel={updateLabel}
        >
          <Text style={styles.updateText}>{uiUpperCase(updateLabel)}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.laterButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
        >
          <Text style={styles.laterText}>{uiUpperCase(laterLabel)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingHorizontal: Spacing.md,
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
  },
  updateButton: {
    backgroundColor: AppColors.black,
  },
  updateText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 0.5,
  },
  laterButton: {
    backgroundColor: AppColors.white,
  },
  laterText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
});
