import { BackupButton } from '@/components/backup/backup-button';
import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { PRIVACY_POLICY_URL } from '@/constants/links';
import type { BackupAction } from '@/hooks/use-backup';
import { isPlausibleEmail } from '@/services/backupAccountService';
import { uiUpperCase } from '@/utils/uiText';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface BackupAuthFormProps {
  busy: BackupAction | null;
  onSignIn: (email: string, password: string) => void;
  onRegister: (email: string, password: string) => void;
  onRequestReset: (email: string) => void;
}

/** Create-account / sign-in form. Backup needs an account so a reinstall can find it again. */
export function BackupAuthForm({
  busy,
  onSignIn,
  onRegister,
  onRequestReset,
}: BackupAuthFormProps) {
  const { t } = useTranslation('app');
  const [creating, setCreating] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = useCallback(() => {
    if (creating) onRegister(email, password);
    else onSignIn(email, password);
  }, [creating, email, password, onRegister, onSignIn]);

  const toggleMode = useCallback(() => setCreating((value) => !value), []);
  const changeEmail = useCallback((value: string) => {
    setEmail(value);
    setEmailError(null);
  }, []);

  // "Forgot password?" stays tappable even without an email: a silently dead
  // link is confusing, so say what is missing and move the cursor there.
  const reset = useCallback(() => {
    if (email.trim().length === 0) {
      setEmailError(t('backup.reset_needs_email'));
      emailInputRef.current?.focus();
      return;
    }
    if (!isPlausibleEmail(email)) {
      setEmailError(t('backup.errors.invalid_email'));
      emailInputRef.current?.focus();
      return;
    }
    onRequestReset(email);
  }, [email, onRequestReset, t]);

  const openPrivacyPolicy = useCallback(() => {
    // No browser available is not worth an error message.
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined);
  }, []);

  const submitting = busy === 'register' || busy === 'sign_in';
  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <View>
      <Text style={styles.label}>{uiUpperCase(t('backup.email'))}</Text>
      <TextInput
        ref={emailInputRef}
        style={[styles.input, emailError !== null && styles.inputError]}
        value={email}
        onChangeText={changeEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
        accessibilityLabel={t('backup.email')}
      />
      {emailError !== null && (
        <Text style={styles.fieldError} accessibilityRole="alert">
          {emailError}
        </Text>
      )}

      <Text style={styles.label}>{uiUpperCase(t('backup.password'))}</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={creating ? 'new-password' : 'current-password'}
        textContentType={creating ? 'newPassword' : 'password'}
        editable={!busy}
        onSubmitEditing={canSubmit && !busy ? submit : undefined}
        accessibilityLabel={t('backup.password')}
      />
      {creating && <Text style={styles.hint}>{t('backup.password_hint')}</Text>}

      {creating && (
        <View style={styles.privacy}>
          <Text style={styles.privacyText}>{t('backup.privacy_notice')}</Text>
          <Pressable
            onPress={openPrivacyPolicy}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>{t('backup.privacy_link')}</Text>
          </Pressable>
        </View>
      )}

      <BackupButton
        label={creating ? t('backup.create_account') : t('backup.sign_in')}
        variant="primary"
        onPress={submit}
        loading={submitting}
        disabled={!canSubmit || Boolean(busy)}
      />

      <Pressable onPress={toggleMode} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.link}>
          {creating ? t('backup.have_account') : t('backup.need_account')}
        </Text>
      </Pressable>
      {!creating && (
        <Pressable
          onPress={reset}
          disabled={Boolean(busy)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.link}>{t('backup.forgot_password')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  input: {
    minHeight: 48,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginBottom: Spacing.md,
  },
  inputError: {
    borderColor: AppColors.red,
  },
  fieldError: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.red,
    lineHeight: 20,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  hint: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  privacy: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.cream,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  privacyText: {
    fontSize: Typography.small,
    color: AppColors.textPrimary,
    lineHeight: 20,
  },
  link: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.blue,
    textDecorationLine: 'underline',
    paddingVertical: Spacing.sm,
  },
});
