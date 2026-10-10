import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  AppColors,
  Layout,
  Spacing,
  Typography,
} from '@/constants/design';
import {
  APP_LANGUAGES,
  APP_LANGUAGE_NAMES,
  type AppLanguage,
} from '@/types/language';
import { uiUpperCase } from '@/utils/uiText';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LanguagePickerProps {
  value: AppLanguage;
  onChange: (language: AppLanguage) => void;
  disabled?: boolean;
}

interface LanguageOptionProps {
  language: AppLanguage;
  selected: boolean;
  onSelect: (language: AppLanguage) => void;
}

/** Square code badge ("EN") shared by the trigger row and the option rows. */
function CodeBadge({ language, active }: { language: AppLanguage; active: boolean }) {
  return (
    <View style={[styles.badge, active && styles.badgeActive]}>
      <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
        {language.toUpperCase()}
      </Text>
    </View>
  );
}

function LanguageOption({ language, selected, onSelect }: LanguageOptionProps) {
  const handlePress = useCallback(() => onSelect(language), [language, onSelect]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={APP_LANGUAGE_NAMES[language]}
    >
      <CodeBadge language={language} active={selected} />
      <Text style={styles.optionName}>{APP_LANGUAGE_NAMES[language]}</Text>
      {selected && (
        <IconSymbol name="checkmark.circle.fill" size={24} color={AppColors.black} />
      )}
    </Pressable>
  );
}

/**
 * Settings row showing the current language; tapping opens a bottom sheet with
 * one row per language. Scales to any number of languages, unlike a segmented
 * control.
 */
export function LanguagePicker({ value, onChange, disabled }: LanguagePickerProps) {
  const { t } = useTranslation('app');
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const openSheet = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const handleSelect = useCallback(
    (language: AppLanguage) => {
      onChange(language);
      setOpen(false);
    },
    [onChange],
  );
  const renderOption = useCallback(
    ({ item }: { item: AppLanguage }) => (
      <LanguageOption language={item} selected={item === value} onSelect={handleSelect} />
    ),
    [value, handleSelect],
  );

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${t('settings.language')}: ${APP_LANGUAGE_NAMES[value]}`}
      >
        <CodeBadge language={value} active />
        <Text style={styles.triggerName}>{APP_LANGUAGE_NAMES[value]}</Text>
        <IconSymbol name="chevron.right" size={24} color={AppColors.black} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel={t('settings.close_picker')}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {uiUpperCase(t('settings.select_language'))}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                onPress={close}
                accessibilityRole="button"
              >
                <Text style={styles.closeText}>
                  {uiUpperCase(t('settings.close_picker'))}
                </Text>
              </Pressable>
            </View>
            <FlatList
              data={APP_LANGUAGES}
              keyExtractor={(language) => language}
              renderItem={renderOption}
              extraData={value}
              ItemSeparatorComponent={Separator}
              accessibilityRole="radiogroup"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  // Trigger row
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Layout.buttonHeight,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
  },
  triggerName: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  pressed: {
    opacity: 0.7,
  },

  // Code badge
  badge: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
  },
  badgeActive: {
    backgroundColor: AppColors.blue,
  },
  badgeText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  badgeTextActive: {
    color: AppColors.white,
  },

  // Bottom sheet
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: AppColors.cream,
    borderTopWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingTop: Spacing.md,
    paddingHorizontal: Layout.screenPadding,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
  },
  closeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
  },
  closeText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },

  // Option rows
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Layout.buttonHeight,
    paddingHorizontal: Spacing.md,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
  },
  optionSelected: {
    backgroundColor: AppColors.yellow,
  },
  optionName: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  separator: {
    height: Spacing.sm,
  },
});
