import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import { useSettings } from '@/hooks/use-settings';

// ── Settings Screen ──────────────────────────────────────────────────

export default function SettingsScreen() {
  const {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    isLoading,
  } = useSettings();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <Text style={styles.headerSubtitle}>CUSTOMIZE YOUR EXPERIENCE</Text>
        </View>

        {/* ── Quiz Settings Card ──────────────────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>QUIZ</Text>

          {/* Show English Hint Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingLabel}>SHOW ENGLISH HINT</Text>
              <Text style={styles.settingDescription}>
                Display the English translation beneath the German noun during
                practice.
              </Text>
            </View>
            <Switch
              value={showEnglishHint}
              onValueChange={setShowEnglishHint}
              disabled={isLoading}
              trackColor={{
                false: AppColors.lightGray,
                true: AppColors.yellow,
              }}
              thumbColor={AppColors.white}
              style={styles.switch}
            />
          </View>

          {/* German Spelling Preference */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingLabel}>GERMAN SPELLING</Text>
              <Text style={styles.settingDescription}>
                Choose between Standard German (ß) and Swiss German (ss).
              </Text>
            </View>
            <View style={styles.segmentedControl}>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentButton,
                  styles.segmentButtonLeft,
                  eszettPreference === 'eszett' && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
                onPress={() => setEszettPreference('eszett')}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Use standard German spelling with eszett"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    eszettPreference === 'eszett' &&
                      styles.segmentButtonTextActive,
                  ]}
                >
                  ß
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentButton,
                  styles.segmentButtonRight,
                  eszettPreference === 'ss' && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
                onPress={() => setEszettPreference('ss')}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Use Swiss German spelling with ss"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    eszettPreference === 'ss' &&
                      styles.segmentButtonTextActive,
                  ]}
                >
                  SS
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },

  // Header
  header: {
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },

  // Card
  card: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.lightGray,
    paddingVertical: Spacing.md,
  },
  settingTextGroup: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  switch: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    borderRadius: 16,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  segmentButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    minWidth: 56,
  },
  segmentButtonLeft: {
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  segmentButtonRight: {
    // No additional border needed
  },
  segmentButtonActive: {
    backgroundColor: AppColors.blue,
  },
  segmentButtonPressed: {
    opacity: 0.7,
  },
  segmentButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  segmentButtonTextActive: {
    color: AppColors.white,
  },
});
