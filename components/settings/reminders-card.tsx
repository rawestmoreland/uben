import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
} from '@/constants/design';
import { useReminders } from '@/hooks/use-reminders';
import type { ReminderTime } from '@/services/reminderPlanner';
import { uiUpperCase } from '@/utils/uiText';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

const SWITCH_TRACK_COLORS = {
  false: AppColors.lightGray,
  true: AppColors.yellow,
};

/** Locale-aware clock text (12h/24h follows the device). */
function formatClock(time: ReminderTime): string {
  return new Date(2000, 0, 1, time.hour, time.minute).toLocaleTimeString(
    undefined,
    { hour: 'numeric', minute: '2-digit' },
  );
}

/** Settings card for practice reminders: on/off, time of day, streak reminder. */
export function RemindersCard() {
  const { t } = useTranslation('app');
  const {
    enabled,
    time,
    streakEnabled,
    permission,
    isLoading,
    setEnabled,
    shiftTime,
    setStreakEnabled,
    openSystemSettings,
  } = useReminders();

  // Local notifications aren't available on web.
  if (Platform.OS === 'web') return null;

  return (
    <View style={[styles.card, shadowStyle]}>
      <Text style={styles.cardTitle}>
        {uiUpperCase(t('settings.reminders_title'))}
      </Text>

      <View style={styles.settingRow}>
        <View style={styles.settingTextGroup}>
          <Text style={styles.settingLabel}>
            {uiUpperCase(t('settings.reminders_enable'))}
          </Text>
          <Text style={styles.settingDescription}>
            {t('settings.reminders_enable_description')}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          disabled={isLoading}
          trackColor={SWITCH_TRACK_COLORS}
          thumbColor={AppColors.white}
          style={styles.switch}
        />
      </View>

      {permission === 'denied' && !enabled && (
        <View style={styles.settingRowStacked}>
          <Text style={styles.deniedText}>
            {t('settings.reminders_denied')}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.pressed,
            ]}
            onPress={openSystemSettings}
            accessibilityRole="button"
          >
            <Text style={styles.settingsButtonText}>
              {uiUpperCase(t('settings.reminders_open_settings'))}
            </Text>
          </Pressable>
        </View>
      )}

      {enabled && (
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingLabel}>
                {uiUpperCase(t('settings.reminders_time'))}
              </Text>
              <Text style={styles.settingDescription}>
                {t('settings.reminders_time_description')}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={({ pressed }) => [
                  styles.stepperButton,
                  styles.stepperButtonLeft,
                  pressed && styles.pressed,
                ]}
                onPress={() => shiftTime(-1)}
                accessibilityRole="button"
                accessibilityLabel={t('settings.reminders_time_earlier')}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{formatClock(time)}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.stepperButton,
                  styles.stepperButtonRight,
                  pressed && styles.pressed,
                ]}
                onPress={() => shiftTime(1)}
                accessibilityRole="button"
                accessibilityLabel={t('settings.reminders_time_later')}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingLabel}>
                {uiUpperCase(t('settings.reminders_streak'))}
              </Text>
              <Text style={styles.settingDescription}>
                {t('settings.reminders_streak_description')}
              </Text>
            </View>
            <Switch
              value={streakEnabled}
              onValueChange={setStreakEnabled}
              trackColor={SWITCH_TRACK_COLORS}
              thumbColor={AppColors.white}
              style={styles.switch}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.7,
  },

  // Permission denied
  deniedText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.red,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  settingsButton: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  settingsButtonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },

  // Time stepper
  stepper: {
    flexDirection: 'row',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  stepperButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.yellow,
  },
  stepperButtonLeft: {
    borderRightWidth: Layout.borderWidthThin,
    borderRightColor: AppColors.black,
  },
  stepperButtonRight: {
    borderLeftWidth: Layout.borderWidthThin,
    borderLeftColor: AppColors.black,
  },
  stepperButtonText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  stepperValue: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: AppColors.white,
  },
  stepperValueText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
});
