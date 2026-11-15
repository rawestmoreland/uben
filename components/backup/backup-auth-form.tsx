import { BackupButton } from '@/components/backup/backup-button';
import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type { BackupAction } from '@/hooks/use-backup';
import { uiUpperCase } from '@/utils/uiText';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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

  const submit = useCallback(() => {
    if (creating) onRegister(email, password);
    else onSignIn(email, password);
  }, [creating, email, password, onRegister, onSignIn]);

  const toggleMode = useCallback(() => setCreating((value) => !value), []);
  const reset = useCallback(() => onRequestReset(email), [email, onRequestReset]);

  const submitting = busy === 'register' || busy === 'sign_in';
  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <View>
      <Text style={styles.label}>{uiUpperCase(t('backup.email'))}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
        accessibilityLabel={t('backup.email')}
      />

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
          disabled={Boolean(busy) || email.trim().length === 0}
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
  hint: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  link: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.blue,
    textDecorationLine: 'underline',
    paddingVertical: Spacing.sm,
  },
});
