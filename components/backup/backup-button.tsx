import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

interface BackupButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Shows a spinner in place of the label. */
  loading?: boolean;
  disabled?: boolean;
}

/** Chunky button for the backup screen: yellow primary, white secondary, red destructive. */
export function BackupButton({
  label,
  onPress,
  variant = 'secondary',
  loading = false,
  disabled = false,
}: BackupButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        variant !== 'danger' && shadowStyleSmall,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
      ]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={AppColors.black} />
      ) : (
        <Text style={styles.text}>{uiUpperCase(label)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  primary: {
    backgroundColor: AppColors.yellow,
  },
  danger: {
    backgroundColor: AppColors.red,
  },
  pressed: {
    transform: [{ translateY: 2 }],
  },
  inactive: {
    opacity: 0.5,
  },
  text: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
