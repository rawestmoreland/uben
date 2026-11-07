import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface UpdateRequiredModalProps {
  visible: boolean;
  title: string;
  body: string;
  updateLabel: string;
  onUpdate: () => void;
}

/**
 * Blocking full-screen notice for a build below `min_version`.
 * There is deliberately no close button and the Android back button is ignored.
 */
export function UpdateRequiredModal({
  visible,
  title,
  body,
  updateLabel,
  onUpdate,
}: UpdateRequiredModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.title}>{uiUpperCase(title)}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={onUpdate}
            accessibilityRole="button"
            accessibilityLabel={updateLabel}
          >
            <Text style={styles.buttonText}>{uiUpperCase(updateLabel)}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: AppColors.cream,
    justifyContent: 'center',
    padding: Layout.screenPadding,
  },
  card: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  body: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginTop: Spacing.md,
  },
  button: {
    minHeight: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.black,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    marginTop: Spacing.lg,
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
  },
  buttonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 0.5,
  },
});
