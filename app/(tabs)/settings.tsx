import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import { getMigrationDiagnostics } from '@/database/db';
import { useSettings } from '@/hooks/use-settings';
import type { MigrationDiagnostics } from '@/types/database';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Settings Screen ──────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t } = useTranslation('app');
  const {
    showEnglishHint,
    setShowEnglishHint,
    eszettPreference,
    setEszettPreference,
    appLanguage,
    setAppLanguage,
    isLoading,
  } = useSettings();

  const [diagnostics, setDiagnostics] = useState<MigrationDiagnostics | null>(
    null,
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    getMigrationDiagnostics()
      .then(setDiagnostics)
      .catch(() => {}); // silently ignore — diagnostics are best-effort
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('settings.title').toUpperCase()}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('settings.customize_your_experience').toUpperCase()}
          </Text>
        </View>

        {/* ── Language Card ───────────────────────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {t('settings.language').toUpperCase()}
          </Text>

          <View style={styles.settingRowStacked}>
            <Text style={styles.settingLabel}>
              {t('settings.language').toUpperCase()}
            </Text>
            <Text style={styles.settingDescription}>
              {t('settings.choose_app_language')}
            </Text>
            <View style={styles.segmentedControlFull}>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentButton,
                  styles.segmentButtonFlex,
                  styles.segmentButtonLeft,
                  appLanguage === 'en' && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
                onPress={() => setAppLanguage('en')}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="English"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    appLanguage === 'en' && styles.segmentButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentButton,
                  styles.segmentButtonFlex,
                  styles.segmentButtonMiddle,
                  appLanguage === 'it' && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
                onPress={() => setAppLanguage('it')}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Italiano"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    appLanguage === 'it' && styles.segmentButtonTextActive,
                  ]}
                >
                  IT
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.segmentButton,
                  styles.segmentButtonFlex,
                  styles.segmentButtonRight,
                  appLanguage === 'pl' && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
                onPress={() => setAppLanguage('pl')}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Polski"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    appLanguage === 'pl' && styles.segmentButtonTextActive,
                  ]}
                >
                  PL
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Quiz Settings Card ──────────────────────────────── */}
        <View style={[styles.card, shadowStyle]}>
          <Text style={styles.cardTitle}>{t('quiz').toUpperCase()}</Text>

          {/* Show English Hint Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingLabel}>
                {t('settings.show_english_hint').toUpperCase()}
              </Text>
              <Text style={styles.settingDescription}>
                {t('settings.display_english_translation')}
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
              <Text style={styles.settingLabel}>
                {t('settings.german_spelling').toUpperCase()}
              </Text>
              <Text style={styles.settingDescription}>
                {t('settings.choose_between_standard_german_and_swiss_german')}
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
                accessibilityLabel={t(
                  'settings.use_standard_german_with_eszett',
                )}
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
                accessibilityLabel={t('settings.use_swiss_german_with_ss')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    eszettPreference === 'ss' && styles.segmentButtonTextActive,
                  ]}
                >
                  SS
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        {/* ── Database Diagnostics Card ───────────────────────── */}
        {diagnostics !== null && (
          <View style={[styles.card, shadowStyle]}>
            <View style={styles.diagHeader}>
              <Text style={styles.cardTitle}>DATABASE</Text>
              <View
                style={[
                  styles.healthBadge,
                  diagnostics.isHealthy
                    ? styles.healthBadgeOk
                    : styles.healthBadgeError,
                ]}
              >
                <Text style={styles.healthBadgeText}>
                  {diagnostics.isHealthy ? 'OK' : 'ERROR'}
                </Text>
              </View>
            </View>

            <View style={styles.settingRowStacked}>
              <Text style={styles.settingLabel}>SCHEMA</Text>
              <Text style={styles.diagValue}>
                {diagnostics.appliedCount} / {diagnostics.expectedCount}{' '}
                migrations applied
              </Text>
            </View>

            {diagnostics.failures.length > 0 && (
              <View style={[styles.settingRowStacked, styles.diagFailureBlock]}>
                <Text style={[styles.settingLabel, styles.diagFailureLabel]}>
                  FAILED MIGRATIONS
                </Text>
                {diagnostics.failures.map((entry) => (
                  <View key={entry.id} style={styles.diagFailureRow}>
                    <Text style={styles.diagFailureVersion}>
                      v{entry.migration_version}
                    </Text>
                    <Text style={styles.diagFailureMessage} numberOfLines={3}>
                      {entry.error_message ?? 'Unknown error'}
                    </Text>
                    <Text style={styles.diagTimestamp}>{entry.logged_at}</Text>
                  </View>
                ))}
              </View>
            )}

            {diagnostics.log.length > 0 && (
              <View style={styles.settingRowStacked}>
                <Text style={styles.settingLabel}>RECENT EVENTS</Text>
                {diagnostics.log.slice(0, 8).map((entry) => (
                  <View key={entry.id} style={styles.diagLogRow}>
                    <Text
                      style={[
                        styles.diagLogEvent,
                        entry.event === 'failed' && styles.diagLogEventFailed,
                        entry.event === 'completed' &&
                          styles.diagLogEventCompleted,
                      ]}
                    >
                      {entry.event.toUpperCase()}
                    </Text>
                    <Text style={styles.diagLogVersion}>
                      v{entry.migration_version}
                    </Text>
                    {entry.duration_ms !== null && (
                      <Text style={styles.diagLogDuration}>
                        {entry.duration_ms}ms
                      </Text>
                    )}
                    <Text style={styles.diagTimestamp} numberOfLines={1}>
                      {entry.logged_at}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
  settingRowStacked: {
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
  segmentedControlFull: {
    flexDirection: 'row',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  segmentButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    minWidth: 56,
  },
  segmentButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  segmentButtonLeft: {
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  segmentButtonMiddle: {
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

  // Database diagnostics
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  healthBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
  },
  healthBadgeOk: {
    backgroundColor: AppColors.green,
  },
  healthBadgeError: {
    backgroundColor: AppColors.red,
  },
  healthBadgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
  },
  diagValue: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  diagFailureBlock: {
    backgroundColor: '#FFF0F0',
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.red,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  diagFailureLabel: {
    color: AppColors.red,
  },
  diagFailureRow: {
    marginTop: Spacing.sm,
  },
  diagFailureVersion: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.red,
  },
  diagFailureMessage: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    fontFamily: 'monospace' as const,
    marginTop: 2,
  },
  diagLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  diagLogEvent: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    minWidth: 72,
  },
  diagLogEventFailed: {
    color: AppColors.red,
  },
  diagLogEventCompleted: {
    color: AppColors.green,
  },
  diagLogVersion: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  diagLogDuration: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
  },
  diagTimestamp: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    flex: 1,
  },
});
