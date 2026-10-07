import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { Pressable, StyleSheet, Text } from 'react-native';

interface QuizActionButtonProps {
  label: string;
  onPress: () => void;
}

/** Full-width chunky yellow button used for Continue / Back to home in quizzes. */
export function QuizActionButton({ label, onPress }: QuizActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        shadowStyle,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.text}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingHorizontal: Spacing.xl,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  text: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
