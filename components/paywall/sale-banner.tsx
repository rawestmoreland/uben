import {
  AppColors,
  Layout,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { StyleSheet, Text, View } from 'react-native';

interface SaleBannerProps {
  title: string;
  body: string;
}

/** Limited-time sale announcement shown at the top of the paywall. */
export function SaleBanner({ title, body }: SaleBannerProps) {
  return (
    <View
      style={[styles.banner, shadowStyleSmall]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${body}`}
    >
      <Text style={styles.title}>{uiUpperCase(title)}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    // Blue, not red: white on red misses AA contrast at this text size, and
    // red means "wrong answer" elsewhere in the app.
    backgroundColor: AppColors.blue,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
    textAlign: 'center',
  },
  body: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.white,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
