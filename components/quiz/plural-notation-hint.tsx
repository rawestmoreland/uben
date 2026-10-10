import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiUpperCase } from '@/utils/uiText';

interface PluralNotationHintProps {
  onDismiss: () => void;
}

/** One-time explainer for the textbook notation on the ending buttons. */
export function PluralNotationHint({ onDismiss }: PluralNotationHintProps) {
  const { t } = useTranslation('app');

  return (
    <View style={styles.hint}>
      <Text style={styles.title}>{uiUpperCase(t('plural_quiz.hint.title'))}</Text>
      <HintLine symbol="¨" text={t('plural_quiz.hint.umlaut')} />
      <HintLine symbol="-e" text={t('plural_quiz.hint.suffix')} />
      <HintLine symbol="-" text={t('plural_quiz.hint.no_change')} />
      <Pressable
        style={({ pressed }) => [
          styles.dismissButton,
          shadowStyleSmall,
          pressed && styles.dismissButtonPressed,
        ]}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('plural_quiz.hint.dismiss')}
      >
        <Text style={styles.dismissText}>
          {uiUpperCase(t('plural_quiz.hint.dismiss'))}
        </Text>
      </Pressable>
    </View>
  );
}

function HintLine({ symbol, text }: { symbol: string; text: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.symbol} accessibilityElementsHidden importantForAccessibility="no">
        {symbol}
      </Text>
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    backgroundColor: AppColors.cream,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    borderStyle: 'dashed',
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  title: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  symbol: {
    width: 32,
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  lineText: {
    flex: 1,
    fontSize: Typography.small,
    color: AppColors.textSecondary,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  dismissButtonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  dismissText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
